# Multi-variant product card + variant sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Products with more than one variant show `ADD` + `N options`, open the variant sheet on every CTA tap, and mirror the in-cart variant's price, pack size, and total quantity on the card — with no per-tap network request.

**Architecture:** Variant arrays already arrive in every product-list response and are currently discarded by `mapProduct`; we retain them on `HomeProduct.variants`. A new `lastVariantKey` map in the Zustand store records which variant of a product was touched most recently, and the card reads that line's persisted `CartSnapshot` for price and pack label. A pure helper, `resolveVariantCardView`, turns (variants, snapshot, count) into what the card renders, so all three card components stay thin and the rules are unit-tested in one place.

**Tech Stack:** React Native / Expo SDK 55, expo-router, Zustand, NativeWind, Jest (`jest-expo`) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-07-25-multi-variant-product-card-design.md`

---

## Conventions you need to know

- **Prices are in "units", not rupees.** `1 unit = 1/20 ₹`. API responses arrive in rupees and are converted at the mapper boundary with `toUnits()`; everything downstream (snapshots, bill, cards) is units, and `rupees(units)` is the only thing that formats for display. See `src/shared/utils/currency.ts`. Never write `₹{value}`.
- **Cart keys.** A product with no variants (or a single one) is keyed by `product.id`. A variant is keyed `` `${product.id}-v${index}` ``. Do not change this scheme — persisted carts depend on it.
- **`hasVariants` means "more than one".** `mapProduct` sets `hasVariants: variantIds.length > 1` (`homeLayoutMapper.ts:141`). Single-variant products behave exactly like variant-less ones and are out of scope for every behavioural change here.
- **Run tests with** `npx jest <path>`. Full suite: `npm test`.
- **Two product shapes exist.** `HomeProduct` (`src/features/home/data/homeLayout.types.ts`) is the list/card shape. `Product` (`src/base/types/village.types.ts`) is the richer shape the variant sheet and the static catalog use. `Variant` lives in `village.types.ts` and is reused by both.

## File structure

| File | Responsibility |
|---|---|
| `src/features/home/data/homeLayout.types.ts` | **Modify** — add `variants?: Variant[]` to `HomeProduct` |
| `src/features/home/data/homeLayoutMapper.ts` | **Modify** — `mapVariant` maps `image`; `mapProduct` retains the variant array |
| `src/core/store/useVillageStore.ts` | **Modify** — `lastVariantKey` state, its maintenance in the three cart mutators, persistence, and two selectors |
| `src/shared/utils/variantCardView.ts` | **Create** — pure `resolveVariantCardView` presentation helper |
| `src/shared/hooks/useVariantSheet.ts` | **Create** — owns variant-sheet open/close state + the detail-fetch fallback (replaces 3 copy-pasted screen handlers) |
| `src/features/home/views/home/components/DynamicProductCard.tsx` | **Modify** — options sublabel, pack line, total-count stepper that opens the sheet |
| `src/shared/components/ProductCard.tsx` | **Modify** — same card rules for the `Product` shape |
| `src/shared/components/MiniProductCard.tsx` | **Modify** — options sublabel |
| `src/shared/components/VariantBottomSheet.tsx` | **Modify** — per-variant thumbnail |
| `src/features/home/views/category-details/CategoryDetailsScreen.tsx` | **Modify** — use `useVariantSheet`, delete local fetch |
| `src/features/home/views/home/components/ProductCarouselRow.tsx` | **Modify** — same |
| `src/features/home/views/search/SearchScreen.tsx` | **Modify** — same |

---

### Task 1: Retain variants from list responses

**Files:**
- Modify: `src/features/home/data/homeLayout.types.ts`
- Modify: `src/features/home/data/homeLayoutMapper.ts:37-51` (`mapVariant`), `:98-143` (`mapProduct`)
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/features/home/data/__tests__/homeLayoutMapper.test.ts`. Note the `toUnits` convention: `mrp: 599` rupees becomes `599 / 20 = 29.95` units.

```ts
import { mapProduct } from '../homeLayoutMapper';

describe('mapProduct variants', () => {
  const raw = {
    _id: 'p1',
    title: 'Figaro Extra Virgin Olive Oil',
    variantIds: [
      {
        _id: 'v1',
        title: '1 pc (250 ml)',
        mrp: 599,
        dealPrice: 310,
        stockId: { stock: 4 },
        landingImage: 'https://cdn/250.jpg',
      },
      {
        _id: 'v2',
        title: '1 pc (1 L)',
        mrp: 1999,
        dealPrice: 1165,
        stock: 2,
        images: ['https://cdn/1l.jpg'],
      },
    ],
  };

  it('keeps every variant on the mapped product, in rupee-to-unit terms', () => {
    const product = mapProduct(raw);
    expect(product.variants).toHaveLength(2);
    expect(product.variants?.[0]).toMatchObject({
      id: 'v1',
      name: '1 pc (250 ml)',
      price: 310 / 20,
      mrp: 599 / 20,
      stock: 4,
      image: 'https://cdn/250.jpg',
    });
  });

  it('falls back to the first gallery image when there is no landingImage', () => {
    expect(mapProduct(raw).variants?.[1].image).toBe('https://cdn/1l.jpg');
  });

  it('still flags hasVariants only when there is more than one', () => {
    expect(mapProduct(raw).hasVariants).toBe(true);
    const single = { ...raw, variantIds: [raw.variantIds[0]] };
    expect(mapProduct(single).hasVariants).toBe(false);
    expect(mapProduct(single).variants).toHaveLength(1);
  });

  it('leaves variants undefined when the response has none', () => {
    expect(mapProduct({ _id: 'p2', title: 'Loose rice', mrp: 100 }).variants).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts`
Expected: FAIL — `product.variants` is `undefined` (the property does not exist yet).

- [ ] **Step 3: Add the field to the type**

In `src/features/home/data/homeLayout.types.ts`, import `Variant` and add the field to `HomeProduct` (after `hasVariants` on line 34):

```ts
import { Variant } from '@/src/base/types/village.types';

export interface HomeProduct {
  // ...existing fields...
  hasVariants?: boolean; // product has multiple variant options
  /** Variants as they arrived in the list response — the variant sheet renders
   *  these directly, so opening it costs no extra request. */
  variants?: Variant[];
}
```

- [ ] **Step 4: Map the image and retain the array**

In `src/features/home/data/homeLayoutMapper.ts`, replace `mapVariant` (lines 37-51) with:

```ts
function mapVariant(v: any): Variant {
  // Rupees in, internal units out — see shared/utils/currency.
  const mrp = toUnits(num(v?.mrp));
  const price = toUnits(num(v?.dealPrice ?? v?.listPrice ?? v?.mrp));
  // Get stock from stockId nested object if available
  const stock = v?.stockId?.stock ?? num(v?.stock);
  const images = Array.isArray(v?.images) ? v.images : [];
  const image = v?.landingImage || images[0];

  return {
    id: String(v?._id ?? ''),
    name: String(v?.title ?? ''),
    price,
    mrp,
    stock,
    image: image ? String(image) : undefined,
  };
}
```

Then in `mapProduct`, add the array to the returned object (alongside `hasVariants` on line 141):

```ts
    hasVariants: hasVariants && p.variantIds.length > 1,
    variants: hasVariants ? p.variantIds.map(mapVariant) : undefined,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts`
Expected: PASS, all cases including the pre-existing `mapHomeLayout` ones.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/data/homeLayout.types.ts src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat: keep list-response variants on HomeProduct"
```

---

### Task 2: Track the last-touched variant in the store

**Files:**
- Modify: `src/core/store/useVillageStore.ts`
- Test: `src/core/store/__tests__/useVillageStore.test.ts`

The card needs to know *which* variant to display. The cart is a flat `Record<key, qty>` with no ordering, so we record the most recently added/changed key per product.

- [ ] **Step 1: Write the failing tests**

Append to `src/core/store/__tests__/useVillageStore.test.ts`. The existing `snapshot()` helper at the top of that file keys everything to itself; these tests need a variant-shaped snapshot, so define a local one.

```ts
import { selectLastVariantSnapshot, selectProductCartCount } from '../useVillageStore';

const variantSnapshot = (productId: string, index: number, price: number) => ({
  key: `${productId}-v${index}`,
  productId,
  variantIndex: index,
  name: 'Figaro Extra Virgin Olive Oil',
  nameTE: '',
  weight: index === 0 ? '1 pc (250 ml)' : '1 pc (1 L)',
  price,
  mrp: price * 2,
});

describe('lastVariantKey', () => {
  beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));

  test('points at the most recently added variant of a product', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (1 L)');
  });

  test('a decrement counts as a touch', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    decFromCart('p1-v0');

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (250 ml)');
  });

  test('falls back to another line of the same product when the pointed-at line leaves', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    decFromCart('p1-v1');

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (250 ml)');
  });

  test('clears the entry once the product has no lines left', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    decFromCart('p1-v0');

    expect(useVillageStore.getState().lastVariantKey.p1).toBeUndefined();
    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())).toBeUndefined();
  });

  test('setQuantity to zero releases the entry too', () => {
    const { addToCart, setQuantity } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    setQuantity('p1-v0', 0);

    expect(useVillageStore.getState().lastVariantKey.p1).toBeUndefined();
  });

  test('survives a persistence round-trip', async () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    await flushPersist();

    useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().lastVariantKey.p1).toBe('p1-v1');
  });

  test('hydrating a cart persisted before this field existed does not throw', async () => {
    mockStore.set(StorageKeys.CART, { cart: { 'p1-v0': 1 }, cartSnapshots: {} });
    useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().cart['p1-v0']).toBe(1);
    expect(useVillageStore.getState().lastVariantKey).toEqual({});
  });
});

describe('selectProductCartCount', () => {
  beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));

  test('sums every variant line of one product and ignores others', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    addToCart('p2-v0', variantSnapshot('p2', 0, 10));

    expect(selectProductCartCount('p1')(useVillageStore.getState())).toBe(3);
  });

  test('counts a variant-less line keyed by the product id', () => {
    useVillageStore.getState().addToCart('p3', snapshot('p3'));
    expect(selectProductCartCount('p3')(useVillageStore.getState())).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/core/store/__tests__/useVillageStore.test.ts`
Expected: FAIL — `selectLastVariantSnapshot` / `selectProductCartCount` are not exported.

- [ ] **Step 3: Add the state, its maintenance, and the selectors**

In `src/core/store/useVillageStore.ts`:

Extend the state interface and initial state:

```ts
interface VillageState {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
  /** Per product id, the cart key of the variant touched most recently. Cards
   *  mirror that line's price and pack size; the cart itself does not use it. */
  lastVariantKey: Record<string, string>;
  favs: Record<string, boolean>;
  locale: Locale;
}

const initialState: VillageState = {
  cart: {},
  cartSnapshots: {},
  lastVariantKey: {},
  favs: {},
  locale: 'en',
};
```

Add the reassignment helper above `useVillageStore`:

```ts
/**
 * A line just left the cart. If it was the one its product pointed at, point the
 * product at any line it still has, or drop the entry when it has none.
 */
function releaseLastVariant(
  lastVariantKey: Record<string, string>,
  cart: CartRecord,
  snapshots: CartSnapshotRecord,
  productId: string | undefined,
  removedKey: string,
): Record<string, string> {
  if (!productId || lastVariantKey[productId] !== removedKey) return lastVariantKey;
  const fallback = Object.keys(cart).find((k) => snapshots[k]?.productId === productId);
  const next = { ...lastVariantKey };
  if (fallback) next[productId] = fallback;
  else delete next[productId];
  return next;
}
```

Replace `addToCart`, `decFromCart`, `setQuantity`, and `clearCart` with:

```ts
  addToCart: (key, snapshot, maxQuantity) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      if (maxQuantity !== undefined && current >= maxQuantity) {
        return state;
      }
      const productId = snapshot?.productId ?? state.cartSnapshots[key]?.productId;
      return {
        cart: {
          ...state.cart,
          [key]: current + 1,
        },
        cartSnapshots:
          snapshot && !state.cartSnapshots[key]
            ? { ...state.cartSnapshots, [key]: snapshot }
            : state.cartSnapshots,
        lastVariantKey: productId
          ? { ...state.lastVariantKey, [productId]: key }
          : state.lastVariantKey,
      };
    }),

  decFromCart: (key) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      const productId = state.cartSnapshots[key]?.productId;
      if (current <= 1) {
        const { [key]: _removed, ...cart } = state.cart;
        const { [key]: _snap, ...cartSnapshots } = state.cartSnapshots;
        return {
          cart,
          cartSnapshots,
          lastVariantKey: releaseLastVariant(state.lastVariantKey, cart, cartSnapshots, productId, key),
        };
      }
      return {
        cart: { ...state.cart, [key]: current - 1 },
        lastVariantKey: productId
          ? { ...state.lastVariantKey, [productId]: key }
          : state.lastVariantKey,
      };
    }),

  setQuantity: (key, quantity, maxQuantity) =>
    set((state) => {
      const capped = maxQuantity !== undefined ? Math.min(quantity, maxQuantity) : quantity;
      const productId = state.cartSnapshots[key]?.productId;

      if (capped <= 0) {
        const { [key]: _removed, ...cart } = state.cart;
        const { [key]: _snap, ...cartSnapshots } = state.cartSnapshots;
        return {
          cart,
          cartSnapshots,
          lastVariantKey: releaseLastVariant(state.lastVariantKey, cart, cartSnapshots, productId, key),
        };
      }

      return {
        cart: { ...state.cart, [key]: capped },
        lastVariantKey: productId
          ? { ...state.lastVariantKey, [productId]: key }
          : state.lastVariantKey,
      };
    }),
```

```ts
  clearCart: () => set({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }),
```

Persist and restore it — update `PersistedCart`, `hydrateCart`, and the subscriber:

```ts
interface PersistedCart {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
  lastVariantKey?: Record<string, string>;
}
```

```ts
      set({
        cart: saved.cart,
        cartSnapshots: saved.cartSnapshots ?? {},
        lastVariantKey: saved.lastVariantKey ?? {},
      });
```

```ts
useVillageStore.subscribe((state, prev) => {
  if (
    state.cart === prev.cart &&
    state.cartSnapshots === prev.cartSnapshots &&
    state.lastVariantKey === prev.lastVariantKey
  ) return;
  void StoredPrefs.setCustomData(StorageKeys.CART, {
    cart: state.cart,
    cartSnapshots: state.cartSnapshots,
    lastVariantKey: state.lastVariantKey,
  }).catch(() => {});
});
```

Add the two selectors at the end of the file, next to `selectCartCount`:

```ts
/**
 * Every cart line belonging to one product, summed. Variant lines are keyed
 * `${productId}-v${index}`; a variant-less product is keyed by its id alone.
 */
export const selectProductCartCount =
  (productId: string) =>
  (state: VillageStore): number => {
    const variantPrefix = `${productId}-v`;
    let total = 0;
    for (const key in state.cart) {
      if (key === productId || key.startsWith(variantPrefix)) total += state.cart[key];
    }
    return total;
  };

/** The snapshot of the variant this product last had added or changed, if any. */
export const selectLastVariantSnapshot =
  (productId: string) =>
  (state: VillageStore): CartSnapshot | undefined => {
    const key = state.lastVariantKey[productId];
    return key ? state.cartSnapshots[key] : undefined;
  };
```

Add `CartSnapshot` to the type import on line 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/core/store/__tests__/useVillageStore.test.ts`
Expected: PASS — the new cases plus every pre-existing one (`selectCartCount`, persistence, hydration).

- [ ] **Step 5: Run the cart suites that depend on the store**

Run: `npx jest src/features/cart`
Expected: PASS. These exercise `addToCart`/`setQuantity` via the bill engine and must be unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/core/store/useVillageStore.ts src/core/store/__tests__/useVillageStore.test.ts
git commit -m "feat: track the last-touched variant per product in the cart store"
```

---

### Task 3: The card presentation helper

**Files:**
- Create: `src/shared/utils/variantCardView.ts`
- Test: `src/shared/utils/__tests__/variantCardView.test.ts`

This is the single place that decides what a card shows. Keeping it pure means the three card components carry no branching logic worth testing through the renderer.

- [ ] **Step 1: Write the failing test**

Create `src/shared/utils/__tests__/variantCardView.test.ts`:

```ts
import { resolveVariantCardView } from '../variantCardView';
import { CartSnapshot, Variant } from '@/src/base/types/village.types';

const variants: Variant[] = [
  { id: 'v0', name: '1 pc (250 ml)', price: 15.5, mrp: 29.95, stock: 4 },
  { id: 'v1', name: '1 pc (1 L)', price: 58.25, mrp: 99.95, stock: 2 },
];

const litreSnapshot: CartSnapshot = {
  key: 'p1-v1',
  productId: 'p1',
  variantIndex: 1,
  name: 'Figaro Extra Virgin Olive Oil',
  weight: '1 pc (1 L)',
  price: 58.25,
  mrp: 99.95,
};

const base = { fallbackPrice: 15.5, fallbackMrp: 29.95 };

describe('resolveVariantCardView', () => {
  it('offers the default variant and an options count when nothing is in the cart', () => {
    expect(resolveVariantCardView({ ...base, variants, lastSnapshot: undefined, totalCount: 0 }))
      .toEqual({
        mode: 'add',
        opensSheet: true,
        price: 15.5,
        mrp: 29.95,
        packLabel: '1 pc (250 ml)',
        optionsLabel: '2 options',
        count: 0,
      });
  });

  it('mirrors the last-touched variant once something is in the cart', () => {
    expect(resolveVariantCardView({ ...base, variants, lastSnapshot: litreSnapshot, totalCount: 3 }))
      .toEqual({
        mode: 'stepper',
        opensSheet: true,
        price: 58.25,
        mrp: 99.95,
        packLabel: '1 pc (1 L)',
        optionsLabel: '2 options',
        count: 3,
      });
  });

  it('ignores a stale snapshot when the product has left the cart', () => {
    const view = resolveVariantCardView({ ...base, variants, lastSnapshot: litreSnapshot, totalCount: 0 });
    expect(view.mode).toBe('add');
    expect(view.packLabel).toBe('1 pc (250 ml)');
    expect(view.price).toBe(15.5);
  });

  it('treats a single variant as an ordinary product — no sheet, no options label', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: [variants[0]],
      lastSnapshot: undefined,
      totalCount: 2,
    });
    expect(view).toEqual({
      mode: 'stepper',
      opensSheet: false,
      price: 15.5,
      mrp: 29.95,
      packLabel: '1 pc (250 ml)',
      optionsLabel: '',
      count: 2,
    });
  });

  it('falls back to product-level pricing when there are no variants at all', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: undefined,
      lastSnapshot: undefined,
      totalCount: 0,
    });
    expect(view).toEqual({
      mode: 'add',
      opensSheet: false,
      price: 15.5,
      mrp: 29.95,
      packLabel: '',
      optionsLabel: '',
      count: 0,
    });
  });

  it('still opens the sheet when the flag is set but the variant array is absent', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: undefined,
      lastSnapshot: undefined,
      totalCount: 0,
      forceSheet: true,
    });
    expect(view.opensSheet).toBe(true);
    expect(view.optionsLabel).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/utils/__tests__/variantCardView.test.ts`
Expected: FAIL — `Cannot find module '../variantCardView'`.

- [ ] **Step 3: Write the helper**

Create `src/shared/utils/variantCardView.ts`:

```ts
/**
 * What a product card shows for a product that may have several variants.
 *
 * The rules, in one place because three card components share them:
 * - Nothing in the cart → offer the default (first) variant's price and pack.
 * - Something in the cart → mirror the variant touched most recently, reading it
 *   from that line's cart snapshot rather than re-deriving it from product data.
 * - The quantity shown is the sum across every variant of the product, so it
 *   always agrees with the cart badge.
 * - Only products with more than one variant open the sheet; anything else keeps
 *   the plain add / stepper behaviour.
 */
import { CartSnapshot, Variant } from '@/src/base/types/village.types';

export interface VariantCardView {
  mode: 'add' | 'stepper';
  /** Whether the CTA — including its +/− — should open the variant sheet. */
  opensSheet: boolean;
  price: number;
  mrp: number;
  /** Pack size, e.g. "1 pc (1 L)". Empty when the product has no variants. */
  packLabel: string;
  /** e.g. "2 options". Empty unless the product has more than one variant. */
  optionsLabel: string;
  count: number;
}

export interface VariantCardInput {
  variants: Variant[] | undefined;
  lastSnapshot: CartSnapshot | undefined;
  totalCount: number;
  /** Product-level price/MRP, used when the product has no variant data. */
  fallbackPrice: number;
  fallbackMrp: number;
  /** Set when the list flagged multiple variants but sent no array — the sheet
   *  still has to open, it just has to fetch first. */
  forceSheet?: boolean;
}

export function resolveVariantCardView({
  variants,
  lastSnapshot,
  totalCount,
  fallbackPrice,
  fallbackMrp,
  forceSheet = false,
}: VariantCardInput): VariantCardView {
  const isMulti = (variants?.length ?? 0) > 1;
  const defaultVariant = variants?.[0];
  const mirrorSnapshot = isMulti && totalCount > 0 ? lastSnapshot : undefined;

  return {
    mode: totalCount > 0 ? 'stepper' : 'add',
    opensSheet: isMulti || forceSheet,
    price: mirrorSnapshot?.price ?? defaultVariant?.price ?? fallbackPrice,
    mrp: mirrorSnapshot?.mrp ?? defaultVariant?.mrp ?? fallbackMrp,
    packLabel: mirrorSnapshot?.weight ?? defaultVariant?.name ?? '',
    optionsLabel: isMulti ? `${variants!.length} options` : '',
    count: totalCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/utils/__tests__/variantCardView.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/variantCardView.ts src/shared/utils/__tests__/variantCardView.test.ts
git commit -m "feat: add the multi-variant card presentation helper"
```

---

### Task 4: One hook owning the variant sheet

**Files:**
- Create: `src/shared/hooks/useVariantSheet.ts`

Three screens currently hold an identical 20-line `handleOpenVariants` that fetches product detail on every tap (`CategoryDetailsScreen.tsx:25-47`, `ProductCarouselRow.tsx:25-48`, `SearchScreen.tsx:37+`). This hook replaces all three: it opens instantly when the card already carries variants, and only falls back to the network when it doesn't.

No test for this task — it is a thin composition of `useState` and an already-tested API call, and Task 5-8 exercise it through the screens. Task 1's mapper test guarantees the data it depends on.

- [ ] **Step 1: Write the hook**

Create `src/shared/hooks/useVariantSheet.ts`:

```ts
// src/shared/hooks/useVariantSheet.ts
//
// Owns the variant bottom sheet for a screen: which product it is showing, and
// how that product's variants were obtained.
//
// List responses already carry a product's variants (see homeLayoutMapper), so
// the common path is synchronous — the sheet opens on the same frame as the tap.
// The detail fetch survives only as a fallback for a response that flagged
// multiple variants without sending them.

import { useCallback, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';

export function useVariantSheet() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const storeId = useStoreId();

  const open = useCallback(
    async (candidate: Product) => {
      if (candidate.variants?.length) {
        setProduct(candidate);
        return;
      }

      setLoading(true);
      try {
        const full = await getProductDetail(storeId, candidate.id);
        setProduct({
          ...candidate,
          name: full.title,
          nameTE: full.teluguTitle || '',
          price: full.price,
          mrp: full.mrp,
          image: full.image,
          variants: full.variants,
        });
      } catch (error) {
        logger.error('Failed to load product variants:', error);
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  const close = useCallback(() => setProduct(null), []);

  return { product, loading, open, close };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors in `useVariantSheet.ts`. (Pre-existing errors elsewhere in the repo, if any, are not yours to fix — compare against `git stash`-ed output only if something looks suspicious.)

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/useVariantSheet.ts
git commit -m "feat: add useVariantSheet, opening the sheet without a round-trip"
```

---

### Task 5: Rebuild the DynamicProductCard CTA

**Files:**
- Modify: `src/features/home/views/home/components/DynamicProductCard.tsx`
- Test: `src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx` (create)

This is the card in the category grid, search results, and home rails — the one in the reference screenshots.

- [ ] **Step 1: Write the failing test**

Create `src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DynamicProductCard } from '../DynamicProductCard';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { HomeProduct } from '../../../../data/homeLayout.types';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const multi: HomeProduct = {
  id: 'p1',
  title: 'Figaro Extra Virgin Olive Oil',
  image: 'https://cdn/p1.jpg',
  mrp: 29.95,
  price: 15.5,
  discountPct: 48,
  inStock: true,
  stock: 6,
  hasVariants: true,
  variants: [
    { id: 'v0', name: '1 pc (250 ml)', price: 15.5, mrp: 29.95, stock: 4 },
    { id: 'v1', name: '1 pc (1 L)', price: 58.25, mrp: 99.95, stock: 2 },
  ],
};

const plain: HomeProduct = {
  id: 'p2',
  title: 'Tata Simply Better Groundnut Oil',
  image: 'https://cdn/p2.jpg',
  mrp: 25,
  price: 18,
  discountPct: 28,
  inStock: true,
  stock: 5,
};

beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));

describe('DynamicProductCard, multi-variant', () => {
  it('labels the button with the option count and shows the default pack', () => {
    render(<DynamicProductCard product={multi} onOpenVariants={jest.fn()} />);

    expect(screen.getByText('2 options')).toBeTruthy();
    expect(screen.getByText('1 pc (250 ml)')).toBeTruthy();
    expect(screen.getByText('₹310')).toBeTruthy();
  });

  it('opens the sheet instead of adding to the cart', () => {
    const onOpenVariants = jest.fn();
    render(<DynamicProductCard product={multi} onOpenVariants={onOpenVariants} />);

    fireEvent.press(screen.getByText('ADD'));

    expect(onOpenVariants).toHaveBeenCalledTimes(1);
    expect(onOpenVariants.mock.calls[0][0]).toMatchObject({ id: 'p1', variants: multi.variants });
    expect(useVillageStore.getState().cart).toEqual({});
  });

  it('shows the total across variants and mirrors the last-touched one', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', {
      key: 'p1-v0', productId: 'p1', variantIndex: 0, name: multi.title,
      weight: '1 pc (250 ml)', price: 15.5, mrp: 29.95,
    });
    addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });
    addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });

    render(<DynamicProductCard product={multi} onOpenVariants={jest.fn()} />);

    expect(screen.getByText('3')).toBeTruthy();          // 1 + 2
    expect(screen.getByText('1 pc (1 L)')).toBeTruthy(); // last touched
    expect(screen.getByText('₹1165')).toBeTruthy();
  });

  it('reopens the sheet from the stepper rather than editing the cart', () => {
    const onOpenVariants = jest.fn();
    useVillageStore.getState().addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });

    render(<DynamicProductCard product={multi} onOpenVariants={onOpenVariants} />);
    fireEvent.press(screen.getByTestId('variant-stepper-inc'));
    fireEvent.press(screen.getByTestId('variant-stepper-dec'));

    expect(onOpenVariants).toHaveBeenCalledTimes(2);
    expect(useVillageStore.getState().cart['p1-v1']).toBe(1);
  });
});

describe('DynamicProductCard, no variants', () => {
  it('adds straight to the cart and steps in place', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);

    fireEvent.press(screen.getByText('ADD'));
    expect(useVillageStore.getState().cart.p2).toBe(1);

    fireEvent.press(screen.getByTestId('stepper-inc'));
    expect(useVillageStore.getState().cart.p2).toBe(2);
  });

  it('shows no options label and no pack line', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);
    expect(screen.queryByText(/options/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`
Expected: FAIL — the card renders `OPTIONS`, has no `2 options` text, no pack line, and no `variant-stepper-*` testIDs.

- [ ] **Step 3: Rewrite the card**

Replace `src/features/home/views/home/components/DynamicProductCard.tsx` in full:

```tsx
// src/features/home/views/home/components/DynamicProductCard.tsx

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import {
  selectLastVariantSnapshot,
  selectProductCartCount,
  useVillageStore,
} from '@/src/core/store/useVillageStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { HomeProduct } from '../../../data/homeLayout.types';
import { Product } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { resolveVariantCardView } from '@/src/shared/utils/variantCardView';

interface Props {
  product: HomeProduct;
  width?: DimensionValue;
  onOpenVariants?: (product: Product) => void;
}

const DynamicProductCardComponent = ({ product, width = 150, onOpenVariants }: Props) => {
  // Selectors stay primitive- or snapshot-valued so no new object identity is
  // created per store notification.
  const count = useVillageStore(useMemo(() => selectProductCartCount(product.id), [product.id]));
  const lastSnapshot = useVillageStore(
    useMemo(() => selectLastVariantSnapshot(product.id), [product.id]),
  );
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const openDetail = () => router.push({ pathname: '/product', params: { id: product.id } });

  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const displayTitle = locale === 'te' && product.teluguTitle
    ? product.teluguTitle
    : product.title || 'Product';

  const view = resolveVariantCardView({
    variants: product.variants,
    lastSnapshot,
    totalCount: count,
    fallbackPrice: product.price,
    fallbackMrp: product.mrp,
    forceSheet: !!product.hasVariants,
  });

  const stock = product.stock ?? 0;
  const canAdd = count < stock;

  // With more than one variant the sheet owns every quantity change; the card's
  // controls are display plus a way in.
  const openSheet = () => {
    if (onOpenVariants) {
      onOpenVariants({
        id: product.id,
        categoryId: product.categoryId || '',
        name: product.title,
        nameTE: product.teluguTitle ?? '',
        weight: '',
        price: product.price,
        mrp: product.mrp,
        rating: 0,
        reviews: 0,
        image: product.image,
        variants: product.variants,
      });
      return;
    }
    openDetail();
  };

  const handleAdd = () => {
    if (view.opensSheet) {
      openSheet();
      return;
    }
    addToCart(product.id, {
      key: product.id,
      productId: product.id,
      variantIndex: null,
      name: product.title,
      nameTE: product.teluguTitle,
      weight: '',
      price: product.price,
      mrp: product.mrp,
      imageUrl: product.image,
    }, stock);
  };

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width }}>
      <TouchableOpacity activeOpacity={0.9} onPress={openDetail} style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.image }}
          style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f8fafc' }}
          contentFit="cover"
          transition={150}
        />
        {product.discountPct > 0 ? (
          <View className="absolute top-2 left-2 bg-green-600 rounded-md px-1.5 py-0.5">
            <Text className="text-white text-[10px] font-bold">{product.discountPct}% OFF</Text>
          </View>
        ) : null}
        {!product.inStock ? (
          <View className="absolute inset-0 bg-white/60 items-center justify-center">
            <Text className="text-slate-700 font-bold text-xs">{t('out_of_stock')}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View className="p-2.5">
        <TouchableOpacity activeOpacity={0.9} onPress={openDetail}>
          <Text
            className="text-slate-800 text-sm font-semibold"
            numberOfLines={2}
            style={[{ minHeight: 36 }, teFont]}
          >
            {displayTitle}
          </Text>
        </TouchableOpacity>

        {view.packLabel ? (
          <Text className="text-slate-500 text-[11px] mt-1">{view.packLabel}</Text>
        ) : null}

        <View className="flex-row items-center mt-1.5">
          <Text className="text-slate-900 font-bold text-sm">{rupees(view.price)}</Text>
          {view.mrp > view.price ? (
            <Text className="text-slate-400 text-xs line-through ml-1.5">{rupees(view.mrp)}</Text>
          ) : null}
        </View>

        <View className="mt-2">
          {view.mode === 'add' ? (
            <TouchableOpacity
              disabled={!product.inStock}
              onPress={handleAdd}
              className={`rounded-xl py-1.5 items-center border ${product.inStock ? 'border-green-600' : 'border-slate-200'}`}
            >
              <Text className={`font-bold text-sm ${product.inStock ? 'text-green-700' : 'text-slate-400'}`}>
                {t('add')}
              </Text>
              {view.optionsLabel ? (
                <Text className="text-green-700 text-[10px] opacity-70">{view.optionsLabel}</Text>
              ) : null}
            </TouchableOpacity>
          ) : view.opensSheet ? (
            <TouchableOpacity
              onPress={openSheet}
              className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2"
            >
              <View testID="variant-stepper-dec" className="px-1">
                <Minus size={16} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-sm">{view.count}</Text>
              <View testID="variant-stepper-inc" className="px-1">
                <Plus size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity testID="stepper-dec" onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{view.count}</Text>
              <TouchableOpacity
                testID="stepper-inc"
                onPress={handleAdd}
                disabled={!canAdd}
                hitSlop={6}
                style={{ opacity: canAdd ? 1 : 0.5 }}
              >
                <Plus size={16} color={canAdd ? '#ffffff' : '#d1d5db'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// Rails render many of these; without memo each one re-rendered on every parent
// update and re-ran its NativeWind class resolution.
export const DynamicProductCard = React.memo(DynamicProductCardComponent);
```

Note on the stepper test IDs: with `opensSheet`, `−` and `+` are plain `View`s inside one `TouchableOpacity`, so a press anywhere on the control opens the sheet — pressing either icon bubbles to the parent, which is what the test asserts.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/home/views/home/components/DynamicProductCard.tsx src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx
git commit -m "feat: card shows ADD + N options and mirrors the in-cart variant"
```

---

### Task 6: Wire the three screens to `useVariantSheet`

**Files:**
- Modify: `src/features/home/views/category-details/CategoryDetailsScreen.tsx:20-47`, `:147-150`
- Modify: `src/features/home/views/home/components/ProductCarouselRow.tsx:17-48`, `:70-73`
- Modify: `src/features/home/views/search/SearchScreen.tsx:29-55`, `:159-162`

- [ ] **Step 1: CategoryDetailsScreen**

Delete these imports:

```ts
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';
```

Add:

```ts
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';
```

Replace the `selectedProduct` / `isLoadingVariants` / `storeId` state and the whole `handleOpenVariants` function (lines 21-47) with:

```ts
  const variantSheet = useVariantSheet();
```

Update the card usage:

```tsx
                  <DynamicProductCard
                    product={item}
                    width="100%"
                    onOpenVariants={variantSheet.open}
                  />
```

And the sheet at the bottom:

```tsx
      <VariantBottomSheet product={variantSheet.product} onClose={variantSheet.close} />
```

`useState` stays imported only if still used elsewhere in the file — if the import becomes `React, { useEffect, useRef }`, trim it accordingly.

- [ ] **Step 2: ProductCarouselRow**

Same edit. Delete the `useStoreId` / `getProductDetail` / `logger` imports and the `selectedProduct`, `isLoadingVariants`, `storeId` state plus `handleOpenVariants` (lines 18-48). Add `import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';` and, inside the component:

```ts
  const variantSheet = useVariantSheet();
```

Then:

```tsx
        {section.products.map((p) => (
          <DynamicProductCard key={p.id} product={p} onOpenVariants={variantSheet.open} />
        ))}
      </ScrollView>

      <VariantBottomSheet product={variantSheet.product} onClose={variantSheet.close} />
```

Careful: this component has an early `return null` on line 22 before the hook would be declared. Move `const variantSheet = useVariantSheet();` **above** `if (!section.products.length) return null;` — hooks must not sit after a conditional return.

- [ ] **Step 3: SearchScreen**

Same edit. Delete the `useStoreId` / `getProductDetail` / `logger` imports, the `selectedProduct` / `isLoadingVariants` / `storeId` state and `handleOpenVariants`. Add the hook import, then `const variantSheet = useVariantSheet();` alongside the other hooks, and:

```tsx
              <DynamicProductCard
                product={item}
                width="100%"
                onOpenVariants={variantSheet.open}
              />
```

```tsx
      <VariantBottomSheet product={variantSheet.product} onClose={variantSheet.close} />
```

- [ ] **Step 4: Verify nothing still reaches for product detail on tap**

Run: `grep -rn "getProductDetail\|isLoadingVariants" src/features/home src/shared`
Expected: exactly one hit — `getProductDetail` imported inside `src/shared/hooks/useVariantSheet.ts`. No `isLoadingVariants` anywhere.

- [ ] **Step 5: Type-check and run the suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/views/category-details/CategoryDetailsScreen.tsx src/features/home/views/home/components/ProductCarouselRow.tsx src/features/home/views/search/SearchScreen.tsx
git commit -m "refactor: one hook owns the variant sheet; drop the per-tap detail fetch"
```

---

### Task 7: Per-variant thumbnails in the sheet

**Files:**
- Modify: `src/shared/components/VariantBottomSheet.tsx:76-91`

The reference sheet shows each pack's photo beside its name. `Variant.image` now arrives from the mapper (Task 1).

- [ ] **Step 1: Add the thumbnail**

In the variant row, replace the opening of the row (`<View key={key} className="flex-row items-center py-3 border-b border-slate-50">` and the `<View className="flex-1">` that follows) with:

```tsx
                <View key={key} className="flex-row items-center py-3 border-b border-slate-50">
                  {variant.image ? (
                    <Image
                      source={{ uri: variant.image }}
                      style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 12 }}
                    />
                  ) : null}
                  <View className="flex-1">
```

`Image` is already imported from `react-native` on line 3 — no import change.

- [ ] **Step 2: Verify the sheet still renders**

Run: `npx jest src/shared/components`
Expected: PASS (existing `CartItemRow` and `OrderModificationSheet` suites unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/VariantBottomSheet.tsx
git commit -m "feat: show per-variant thumbnails in the variant sheet"
```

---

### Task 8: Apply the same rules to ProductCard and MiniProductCard

**Files:**
- Modify: `src/shared/components/ProductCard.tsx:26-51`, `:136-180`
- Modify: `src/shared/components/MiniProductCard.tsx:16-24`, `:48-58`

These render the static-catalog `Product` shape on Top Picks and in the cart's suggestions. They already open the sheet; they just do not follow the same display rules, and `ProductCard` shows `2 ADDED` where the reference shows a stepper.

- [ ] **Step 1: ProductCard — replace the count logic**

In `src/shared/components/ProductCard.tsx`, replace lines 26-35 (`isFav` through the `variantCount` reduce) with:

```ts
  const isFav = !!favs[product.id];
  const count = useVillageStore(useMemo(() => selectProductCartCount(product.id), [product.id]));
  const lastSnapshot = useVillageStore(
    useMemo(() => selectLastVariantSnapshot(product.id), [product.id]),
  );
  const stock = product.stock ?? 0;
  const canAdd = stock === 0 ? false : count < stock;

  const view = resolveVariantCardView({
    variants: product.variants,
    lastSnapshot,
    totalCount: count,
    fallbackPrice: product.price,
    fallbackMrp: product.mrp,
  });
```

Delete the now-unused `cart` subscription on line 19 (`const cart = useVillageStore(state => state.cart);`) and the `hasVariants` / `cartKey` locals.

Add to the imports:

```ts
import React, { useMemo } from 'react';
import {
  selectLastVariantSnapshot,
  selectProductCartCount,
  useVillageStore,
} from '@/src/core/store/useVillageStore';
import { resolveVariantCardView } from '@/src/shared/utils/variantCardView';
```

Replace `displayPrice` / `displayMrp` (lines 49-50) with:

```ts
  const displayPrice = rupees(view.price);
  const displayMrp = rupees(view.mrp);
```

and the MRP condition on line 139 with `view.mrp > view.price`.

Replace the weight pill's text (line 132) so it prefers the mirrored pack:

```tsx
            {view.packLabel || localizeWeight(product.weight, locale)}
```

- [ ] **Step 2: ProductCard — replace the CTA block**

Replace the whole `{/* CTA */}` block (lines 144-180) with:

```tsx
        {/* CTA */}
        <View className="mt-auto pt-1">
          {view.mode === 'add' ? (
            <TouchableOpacity
              disabled={!view.opensSheet && !canAdd}
              onPress={() =>
                view.opensSheet
                  ? openVariants(product)
                  : addToCart(product.id, productSnapshot(product, null), stock)
              }
              className={`border-2 rounded-lg h-11 items-center justify-center ${view.opensSheet || canAdd ? 'border-green-600' : 'border-slate-300 opacity-50'}`}
            >
              <Text
                className={`font-bold text-base ${view.opensSheet || canAdd ? 'text-green-700' : 'text-slate-400'}`}
                style={teFont}
              >
                {t('add')}
              </Text>
              {view.optionsLabel ? (
                <Text className="text-green-700 text-[10px] opacity-70">{view.optionsLabel}</Text>
              ) : null}
            </TouchableOpacity>
          ) : view.opensSheet ? (
            <TouchableOpacity
              onPress={() => openVariants(product)}
              className="bg-green-600 rounded-lg h-11 flex-row items-center justify-between px-4"
            >
              <Text className="text-white font-bold text-lg">−</Text>
              <Text className="text-white font-bold text-base">{view.count}</Text>
              <Text className="text-white font-bold text-lg">+</Text>
            </TouchableOpacity>
          ) : (
            <CompactStepper
              count={view.count}
              maxQuantity={stock}
              onAdd={() => addToCart(product.id, productSnapshot(product, null), stock)}
              onDec={() => decFromCart(product.id)}
            />
          )}
        </View>
```

Remove the now-unused `ChevronDown` import on line 2 and the `t('added')` usage.

- [ ] **Step 3: MiniProductCard — options sublabel**

In `src/shared/components/MiniProductCard.tsx`, replace lines 19-24 with:

```ts
  const optionCount = product.variants?.length ?? 0;
  const hasVariants = optionCount > 1;

  const handleAdd = () => {
    if (hasVariants) openVariants(product);
    else addToCart(product.id, productSnapshot(product, null));
  };
```

and the button body (lines 52-57) with:

```tsx
          <Text
            className="text-green-700 font-bold text-[10px] px-2"
            style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          >
            {t('add')}
          </Text>
          {hasVariants ? (
            <Text className="text-green-700 text-[8px] opacity-70">{optionCount} options</Text>
          ) : null}
```

Change the button's height class on line 50 from `h-7` to `h-9` so both lines fit.

- [ ] **Step 4: Type-check and run everything**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ProductCard.tsx src/shared/components/MiniProductCard.tsx
git commit -m "feat: apply the multi-variant card rules to ProductCard and MiniProductCard"
```

---

### Task 9: Full verification

- [ ] **Step 1: Whole suite**

Run: `npm test`
Expected: PASS, no skipped-but-expected failures. Record the summary line.

- [ ] **Step 2: Types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; no new lint errors versus `main`.

- [ ] **Step 3: Manual pass on device or simulator**

Run: `npm run ios` (or `npm start` and open on a device)

Walk the reference flow and confirm each:
1. Category listing → a product with 2 variants shows `ADD` with `2 options` beneath, and the default pack's price and size.
2. Tapping `ADD` opens the sheet **immediately** — no perceptible delay, no blank tap.
3. Adding the 1 L from the sheet: card switches to the stepper, shows `1`, price becomes the 1 L price, pack line becomes `1 pc (1 L)`.
4. Adding 2× 250 ml as well: card shows `3`; the price/pack line follows the variant touched last.
5. Tapping `−`, `+`, or the number on the card reopens the sheet and changes no quantity.
6. Removing everything returns the card to `ADD` / `2 options` with the default pack.
7. A single-variant or variant-less product still adds directly and steps in place.
8. Kill and relaunch the app: quantities, price mirroring, and pack line all restore.

- [ ] **Step 4: Commit any fixes, then report**

Report the `npm test` summary and which of the eight manual checks passed. Do not claim completion without both.
