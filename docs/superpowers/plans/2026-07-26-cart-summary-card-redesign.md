# Cart Summary Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `FloatingCartPill` with a denser `CartSummaryCard` (count, total, minimum-order nudge, stacked recent-item thumbnails) and introduce a real ₹199 minimum-order-value gate on checkout.

**Architecture:** Two small pure-domain additions (`computeBill`'s new `belowMinimum`/`amountToMinimum`/`minOrderValue` fields, and `deriveCheckoutState`'s new `below_minimum` state) drive two UI changes: a new `CartSummaryCard` component (replacing `FloatingCartPill` at all 5 call sites) and a new blocked state in `CheckoutBar`. No new screens, no new store state — everything reads from the existing `useVillageStore` cart and the existing bill engine.

**Tech Stack:** React Native (Expo), TypeScript, NativeWind/StyleSheet, Zustand-style store (`useVillageStore`), Jest + `@testing-library/react-native`.

Spec: `docs/superpowers/specs/2026-07-26-cart-summary-card-redesign-design.md`

---

## File Structure

**Modify:**
- `src/base/types/village.types.ts` — `Bill` interface gains 3 fields.
- `src/features/cart/domain/bill.ts` — `MIN_ORDER_VALUE_RUPEES` constant, `computeBill` derives the 3 new fields.
- `src/features/cart/domain/checkoutState.ts` — new `'below_minimum'` state, checked first.
- `src/features/cart/domain/__tests__/checkoutState.test.ts` — extend for the new state.
- `src/base/constants/translations.ts` — 2 new keys.
- `src/core/utils/useTranslation.ts` — 2 new helper functions, following the existing `tEta`/`tItemCount` pattern.
- `src/shared/components/CheckoutBar.tsx` — new blocked-state branch + `amountToMinimum` prop.
- `src/shared/components/index.ts` — swap `FloatingCartPill` export for `CartSummaryCard`.
- `src/features/cart/views/CartScreen.tsx` — pass `belowMinimum`/`amountToMinimum` through.
- `src/features/home/views/home/HomeScreen.tsx`, `src/features/home/views/category-details/CategoryDetailsScreen.tsx`, `src/features/home/views/search/SearchScreen.tsx`, `src/features/home/views/top-picks/TopPicksScreen.tsx`, `src/features/home/views/categories/CategoriesScreen.tsx` — swap `FloatingCartPill` for `CartSummaryCard`.

**Create:**
- `src/features/cart/domain/__tests__/bill.test.ts`
- `src/shared/components/CartSummaryCard.tsx`
- `src/shared/components/__tests__/CartSummaryCard.test.tsx`
- `src/shared/components/__tests__/CheckoutBar.test.tsx`

**Delete:**
- `src/shared/components/FloatingCartPill.tsx`

**Not touched (explicitly out of scope, per spec):** `src/features/product/views/components/ProductCartBar.tsx`.

---

### Task 1: Minimum-order-value math in the bill engine

**Files:**
- Modify: `src/base/types/village.types.ts:95-105`
- Modify: `src/features/cart/domain/bill.ts`
- Test: `src/features/cart/domain/__tests__/bill.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/cart/domain/__tests__/bill.test.ts`:

```ts
import { computeBill } from '../bill';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartLineItem } from '@/src/base/types/village.types';

function lineItem(priceRupees: number, count: number): CartLineItem {
  const priceUnits = toUnits(priceRupees);
  return {
    key: `item-${priceRupees}`,
    productId: `prod-${priceRupees}`,
    variantIndex: null,
    name: 'Test item',
    weight: '1 pc',
    price: priceUnits,
    mrp: priceUnits,
    count,
  };
}

describe('computeBill — minimum order value', () => {
  test('flags belowMinimum when grandTotal is under ₹199', () => {
    const bill = computeBill([lineItem(100, 1)]);

    expect(bill.belowMinimum).toBe(true);
  });

  test('amountToMinimum is the exact rupee shortfall', () => {
    const bill = computeBill([lineItem(100, 1)]);

    expect(Math.round(bill.amountToMinimum * 20)).toBe(99);
  });

  test('is not belowMinimum at exactly ₹199', () => {
    const bill = computeBill([lineItem(199, 1)]);

    expect(bill.belowMinimum).toBe(false);
    expect(bill.amountToMinimum).toBe(0);
  });

  test('is not belowMinimum above ₹199', () => {
    const bill = computeBill([lineItem(250, 1)]);

    expect(bill.belowMinimum).toBe(false);
  });

  test('a coupon discount that drops grandTotal under ₹199 still triggers belowMinimum', () => {
    // itemTotal for a ₹220 item = 11 units. couponDiscount = min(11*0.1, 40/20) = 1.1 units.
    // grandTotal = 11 - 1.1 = 9.9 units = ₹198 — just under the ₹199 line, even though
    // the pre-coupon itemTotal (₹220) would have cleared it.
    const bill = computeBill([lineItem(220, 1)], { couponApplied: true });

    expect(bill.belowMinimum).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/cart/domain/__tests__/bill.test.ts`
Expected: FAIL — `bill.belowMinimum` is `undefined`, not `true`/`false` (the field doesn't exist yet).

- [ ] **Step 3: Add the fields to the `Bill` type**

In `src/base/types/village.types.ts`, replace:

```ts
export interface Bill {
  itemTotal: number;
  mrpTotal: number;
  itemDiscount: number;
  deliveryFee: number;
  platformFee: number;
  couponDiscount: number;
  grandTotal: number;
  totalSavings: number;
  totalCount: number;
}
```

with:

```ts
export interface Bill {
  itemTotal: number;
  mrpTotal: number;
  itemDiscount: number;
  deliveryFee: number;
  platformFee: number;
  couponDiscount: number;
  grandTotal: number;
  totalSavings: number;
  totalCount: number;
  /** The order's minimum required value (internal units) to be eligible for checkout. */
  minOrderValue: number;
  /** True when grandTotal is under minOrderValue. */
  belowMinimum: boolean;
  /** Shortfall (internal units) to reach minOrderValue; 0 when not belowMinimum. */
  amountToMinimum: number;
}
```

- [ ] **Step 4: Implement `computeBill`'s new derivation**

In `src/features/cart/domain/bill.ts`, replace:

```ts
/** Maximum rupee value of the percentage coupon. */
const COUPON_CAP_RUPEES = 40;
```

with:

```ts
/** Maximum rupee value of the percentage coupon. */
const COUPON_CAP_RUPEES = 40;

/** Minimum order value, in rupees, required to place an order. */
const MIN_ORDER_VALUE_RUPEES = 199;
```

Then replace the end of `computeBill`:

```ts
  const grandTotal = itemTotal + deliveryFee + platformFee - couponDiscount;
  const totalSavings = itemDiscount + couponDiscount;

  return { itemTotal, mrpTotal, itemDiscount, deliveryFee, platformFee, couponDiscount, grandTotal, totalSavings, totalCount };
}
```

with:

```ts
  const grandTotal = itemTotal + deliveryFee + platformFee - couponDiscount;
  const totalSavings = itemDiscount + couponDiscount;

  const minOrderValue = MIN_ORDER_VALUE_RUPEES / UNITS_PER_RUPEE;
  const belowMinimum = grandTotal < minOrderValue;
  const amountToMinimum = belowMinimum ? minOrderValue - grandTotal : 0;

  return {
    itemTotal, mrpTotal, itemDiscount, deliveryFee, platformFee, couponDiscount,
    grandTotal, totalSavings, totalCount, minOrderValue, belowMinimum, amountToMinimum,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/features/cart/domain/__tests__/bill.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (the `Bill` type change is additive, so nothing that already destructures/spreads `Bill` should break).

- [ ] **Step 7: Commit**

```bash
git add src/base/types/village.types.ts src/features/cart/domain/bill.ts src/features/cart/domain/__tests__/bill.test.ts
git commit -m "feat(cart): add minimum-order-value derivation to computeBill"
```

---

### Task 2: `below_minimum` checkout gate

**Files:**
- Modify: `src/features/cart/domain/checkoutState.ts`
- Modify: `src/features/cart/domain/__tests__/checkoutState.test.ts`

- [ ] **Step 1: Update the test file (this is the failing-test step — the new/updated assertions won't pass until the implementation changes)**

Replace the full contents of `src/features/cart/domain/__tests__/checkoutState.test.ts`:

```ts
import { deriveCheckoutState } from '../checkoutState';

describe('deriveCheckoutState', () => {
  it('returns "below_minimum" when the cart is under the minimum order value, regardless of auth/address', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: true })).toBe('below_minimum');
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: true })).toBe('below_minimum');
  });

  it('returns "login" when not authenticated and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: false })).toBe('login');
    // auth is the first gate regardless of address
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: true, belowMinimum: false })).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: false, belowMinimum: false })).toBe('address');
  });

  it('returns "place" when authenticated, an address is selected, and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: false })).toBe('place');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/cart/domain/__tests__/checkoutState.test.ts`
Expected: FAIL — `deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: true })` returns `'place'`, not `'below_minimum'` (current implementation ignores the unknown `belowMinimum` field).

- [ ] **Step 3: Implement the new state**

Replace the full contents of `src/features/cart/domain/checkoutState.ts`:

```ts
// Pure derivation of the Cart bottom-bar state from cart eligibility + auth + address.
// No React, no store access — unit-testable in isolation.
//
// Payment is always preselected (Cash on delivery by default) and chosen via
// the inline section below the bill summary, so it is not a gate here: once the
// cart clears the minimum order value and the user is authenticated with a
// delivery address, the bar is ready to place the order.

export type CheckoutState = 'below_minimum' | 'login' | 'address' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  belowMinimum: boolean;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
  belowMinimum,
}: CheckoutInputs): CheckoutState {
  if (belowMinimum) return 'below_minimum';
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  return 'place';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/cart/domain/__tests__/checkoutState.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/domain/checkoutState.ts src/features/cart/domain/__tests__/checkoutState.test.ts
git commit -m "feat(cart): gate checkout on minimum order value"
```

---

### Task 3: Translation keys + `useTranslation` helpers

**Files:**
- Modify: `src/base/constants/translations.ts`
- Modify: `src/core/utils/useTranslation.ts`

No dedicated test: these are one-line wrappers around the already-tested `interpolate`/`translate` functions, following the exact shape of the existing (also untested in isolation) `tEta`/`tItemCount`/`tDiscount` helpers. Coverage comes from the `CartSummaryCard` and `CheckoutBar` component tests in Tasks 4 and 6, which mock this hook.

- [ ] **Step 1: Add the translation keys**

In `src/base/constants/translations.ts`, find the existing cart keys:

```ts
  n_items_cart:        { te: '{n} వస్తువులు కార్ట్‌లో',                            en: '{n} items in cart' },
  view_cart_arrow:     { te: 'కార్ట్ చూడండి →',                                   en: 'View cart →' },
```

Add immediately after:

```ts
  n_items_cart:        { te: '{n} వస్తువులు కార్ట్‌లో',                            en: '{n} items in cart' },
  view_cart_arrow:     { te: 'కార్ట్ చూడండి →',                                   en: 'View cart →' },
  cart_summary_count:  { te: '{n} వస్తువులు',                                     en: '{n} ITEMS' },
  shop_more_to_place_order: { te: 'ఆర్డర్ చేయడానికి ఇంకా {n} కొనండి',              en: 'Shop for {n} more to place order' },
```

- [ ] **Step 2: Add the helper functions**

In `src/core/utils/useTranslation.ts`, replace:

```ts
  function tVariantCartLabel(count: number): string {
    return interpolate(translate('variant_cart_label', locale), count);
  }

  return { t, tEta, tItemCount, tDiscount, tOptionCount, tVariantCartLabel, locale };
}
```

with:

```ts
  function tVariantCartLabel(count: number): string {
    return interpolate(translate('variant_cart_label', locale), count);
  }

  function tCartSummaryCount(count: number): string {
    return interpolate(translate('cart_summary_count', locale), count);
  }

  function tShopMoreToPlaceOrder(amountText: string): string {
    return interpolate(translate('shop_more_to_place_order', locale), amountText);
  }

  return {
    t, tEta, tItemCount, tDiscount, tOptionCount, tVariantCartLabel,
    tCartSummaryCount, tShopMoreToPlaceOrder, locale,
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/base/constants/translations.ts src/core/utils/useTranslation.ts
git commit -m "i18n: add cart summary count and minimum-order nudge strings"
```

---

### Task 4: `CartSummaryCard` component

**Files:**
- Create: `src/shared/components/CartSummaryCard.tsx`
- Test: `src/shared/components/__tests__/CartSummaryCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/__tests__/CartSummaryCard.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshot, CartSnapshotRecord } from '@/src/base/types/village.types';

let mockCart: CartRecord = {};
let mockSnapshots: CartSnapshotRecord = {};

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
}));

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => (key === 'view_cart_arrow' ? 'View cart →' : key),
    tCartSummaryCount: (n: number) => `${n} ITEMS`,
    tShopMoreToPlaceOrder: (amount: string) => `Shop for ${amount} more to place order`,
  }),
}));

function snapshot(productId: string, priceRupees: number, overrides: Partial<CartSnapshot> = {}): CartSnapshot {
  return {
    key: productId,
    productId,
    variantIndex: null,
    name: `Product ${productId}`,
    weight: '1 pc',
    price: toUnits(priceRupees),
    mrp: toUnits(priceRupees),
    emoji: '🍪',
    ...overrides,
  };
}

describe('CartSummaryCard', () => {
  afterEach(() => {
    mockCart = {};
    mockSnapshots = {};
  });

  test('renders nothing when the cart is empty', () => {
    const { toJSON } = render(<CartSummaryCard onPress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  test('below minimum: shows count, total, and the nudge message', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 100) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹100')).toBeTruthy();
    expect(screen.getByText('Shop for ₹99 more to place order')).toBeTruthy();
  });

  test('below minimum: shows a thumbnail stack capped at 3 distinct products', () => {
    mockCart = { p1: 1, p2: 1, p3: 1, p4: 1 };
    mockSnapshots = {
      p1: snapshot('p1', 20),
      p2: snapshot('p2', 20),
      p3: snapshot('p3', 20),
      p4: snapshot('p4', 20),
    };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getAllByTestId('cart-summary-chip')).toHaveLength(3);
  });

  test('below minimum: falls back to emoji when an item has no image', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 20, { imageUrl: undefined, emoji: '🥛' }) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('🥛')).toBeTruthy();
  });

  test('at/above minimum: shows "View cart" action instead of the nudge, no thumbnails', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('View cart →')).toBeTruthy();
    expect(screen.queryByText(/Shop for/)).toBeNull();
    expect(screen.queryAllByTestId('cart-summary-chip')).toHaveLength(0);
  });

  test('tapping the card calls onPress', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) };
    const onPress = jest.fn();

    render(<CartSummaryCard onPress={onPress} />);
    fireEvent.press(screen.getByTestId('cart-summary-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/shared/components/__tests__/CartSummaryCard.test.tsx`
Expected: FAIL — `Cannot find module '../CartSummaryCard'`.

- [ ] **Step 3: Implement `CartSummaryCard`**

Create `src/shared/components/CartSummaryCard.tsx`:

```tsx
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { rupees } from '@/src/shared/utils/currency';
import type { CartLineItem } from '@/src/base/types/village.types';

interface CartSummaryCardProps {
  onPress: () => void;
  bottomOffset?: number;
}

const TAB_BAR_CONTENT_HEIGHT = 64;
const MAX_THUMBNAILS = 3;
const CHIP_SIZE = 32;
const CHIP_OFFSET = 12;

/** Most-recently-added distinct products first, capped at `max`. Cart keys
 *  preserve insertion order, so scanning from the end surfaces recent adds;
 *  a product already seen (e.g. a second variant of the same item) is skipped
 *  so the stack never shows the same product twice. */
function distinctRecentItems(items: CartLineItem[], max: number): CartLineItem[] {
  const seenProductIds = new Set<string>();
  const result: CartLineItem[] = [];
  for (let i = items.length - 1; i >= 0 && result.length < max; i--) {
    const item = items[i];
    if (seenProductIds.has(item.productId)) continue;
    seenProductIds.add(item.productId);
    result.push(item);
  }
  return result;
}

export const CartSummaryCard = ({ onPress, bottomOffset }: CartSummaryCardProps) => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const { t, tCartSummaryCount, tShopMoreToPlaceOrder } = useTranslation();

  const cartItems = React.useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);
  const bill = React.useMemo(() => computeBill(cartItems), [cartItems]);

  if (bill.totalCount === 0) return null;

  const cardBottom = (bottomOffset ?? TAB_BAR_CONTENT_HEIGHT) + 8;
  const recentItems = bill.belowMinimum ? distinctRecentItems(cartItems, MAX_THUMBNAILS) : [];
  const progress = Math.min(1, bill.grandTotal / bill.minOrderValue);

  return (
    <TouchableOpacity
      testID="cart-summary-card"
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, { marginBottom: cardBottom }]}
    >
      <View style={styles.row}>
        <View style={styles.metaBlock}>
          <View style={styles.countLine}>
            <Text style={styles.count}>{tCartSummaryCount(bill.totalCount)}</Text>
            <Text style={styles.dot}>{'·'}</Text>
            <Text style={styles.total}>{rupees(bill.grandTotal)}</Text>
          </View>
          {bill.belowMinimum && (
            <>
              <Text style={styles.nudge}>{tShopMoreToPlaceOrder(rupees(bill.amountToMinimum))}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </>
          )}
        </View>

        {bill.belowMinimum ? (
          <View style={[styles.stack, { width: CHIP_SIZE + (recentItems.length - 1) * CHIP_OFFSET }]}>
            {recentItems.map((item, index) => (
              <View
                key={item.key}
                testID="cart-summary-chip"
                style={[
                  styles.chip,
                  { left: index * CHIP_OFFSET, top: index * 3, zIndex: recentItems.length - index },
                ]}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.chipImage} contentFit="cover" />
                ) : (
                  <Text style={styles.chipEmoji}>{item.emoji}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{t('view_cart_arrow')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    backgroundColor: '#0f5132',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#0f5132',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBlock: { flex: 1 },
  countLine: { flexDirection: 'row', alignItems: 'center' },
  count: { color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },
  dot: { color: 'rgba(255,255,255,0.55)', marginHorizontal: 5, fontSize: 13 },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  nudge: { color: '#d1fae5', fontWeight: '600', fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
    width: 160,
  },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 3 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  stack: { height: CHIP_SIZE + 6, marginLeft: 10 },
  chip: {
    position: 'absolute',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0f5132',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  chipImage: { width: '100%', height: '100%', borderRadius: 6 },
  chipEmoji: { fontSize: 14 },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/shared/components/__tests__/CartSummaryCard.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/CartSummaryCard.tsx src/shared/components/__tests__/CartSummaryCard.test.tsx
git commit -m "feat(cart): add CartSummaryCard component"
```

---

### Task 5: Wire `CartSummaryCard` into the app, remove `FloatingCartPill`

**Files:**
- Modify: `src/shared/components/index.ts`
- Delete: `src/shared/components/FloatingCartPill.tsx`
- Modify: `src/features/home/views/home/HomeScreen.tsx:6,199`
- Modify: `src/features/home/views/category-details/CategoryDetailsScreen.tsx:6,114-116`
- Modify: `src/features/home/views/search/SearchScreen.tsx:13,126-128`
- Modify: `src/features/home/views/top-picks/TopPicksScreen.tsx:14,174-176`
- Modify: `src/features/home/views/categories/CategoriesScreen.tsx:6,83-85`

- [ ] **Step 1: Swap the barrel export**

In `src/shared/components/index.ts`, replace:

```ts
export { FloatingCartPill } from './FloatingCartPill';
```

with:

```ts
export { CartSummaryCard } from './CartSummaryCard';
```

- [ ] **Step 2: Delete the old component**

```bash
rm src/shared/components/FloatingCartPill.tsx
```

- [ ] **Step 3: Update `HomeScreen.tsx`**

Replace:

```tsx
import { FloatingCartPill, VariantBottomSheet } from '@/src/shared/components';
```

with:

```tsx
import { CartSummaryCard, VariantBottomSheet } from '@/src/shared/components';
```

Replace:

```tsx
      {vm.cartCount > 0 && <FloatingCartPill count={vm.cartCount} onPress={goToCart} />}
```

with:

```tsx
      {vm.cartCount > 0 && <CartSummaryCard onPress={goToCart} />}
```

- [ ] **Step 4: Update `CategoryDetailsScreen.tsx`**

Replace:

```tsx
import { FloatingCartPill } from '@/src/shared/components';
```

with:

```tsx
import { CartSummaryCard } from '@/src/shared/components';
```

Replace:

```tsx
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={() => router.push('/cart')} bottomOffset={0} />
      )}
```

with:

```tsx
      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={() => router.push('/cart')} bottomOffset={0} />
      )}
```

- [ ] **Step 5: Update `SearchScreen.tsx`**

Replace:

```tsx
import { FloatingCartPill } from '@/src/shared/components';
```

with:

```tsx
import { CartSummaryCard } from '@/src/shared/components';
```

Replace:

```tsx
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} bottomOffset={0} />
      )}
```

with:

```tsx
      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={goToCart} bottomOffset={0} />
      )}
```

- [ ] **Step 6: Update `TopPicksScreen.tsx`**

Replace the `FloatingCartPill` entry in the `@/src/shared/components` import list with `CartSummaryCard`.

Replace:

```tsx
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
```

with:

```tsx
      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={goToCart} />
      )}
```

- [ ] **Step 7: Update `CategoriesScreen.tsx`**

Replace:

```tsx
import { FloatingCartPill } from '@/src/shared/components';
```

with:

```tsx
import { CartSummaryCard } from '@/src/shared/components';
```

Replace:

```tsx
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={() => router.push('/cart')} />
      )}
```

with:

```tsx
      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={() => router.push('/cart')} />
      )}
```

- [ ] **Step 8: Confirm no remaining references**

Run: `grep -rn "FloatingCartPill" src/`
Expected: no output.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Run the full test suite**

Run: `npx jest`
Expected: PASS (no test referenced `FloatingCartPill` directly, so nothing else should break).

- [ ] **Step 11: Commit**

```bash
git add src/shared/components/index.ts src/features/home/views/home/HomeScreen.tsx \
  src/features/home/views/category-details/CategoryDetailsScreen.tsx \
  src/features/home/views/search/SearchScreen.tsx \
  src/features/home/views/top-picks/TopPicksScreen.tsx \
  src/features/home/views/categories/CategoriesScreen.tsx
git add -u src/shared/components/FloatingCartPill.tsx
git commit -m "feat(cart): replace FloatingCartPill with CartSummaryCard at all call sites"
```

---

### Task 6: `CheckoutBar` blocked state

**Files:**
- Modify: `src/shared/components/CheckoutBar.tsx`
- Test: `src/shared/components/__tests__/CheckoutBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/__tests__/CheckoutBar.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CheckoutBar } from '../CheckoutBar';
import { toUnits } from '@/src/shared/utils/currency';

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => key,
    tShopMoreToPlaceOrder: (amount: string) => `Shop for ${amount} more to place order`,
  }),
}));

describe('CheckoutBar', () => {
  const noop = () => {};

  test('below_minimum: shows the nudge message, no place-order button', () => {
    render(
      <CheckoutBar
        state="below_minimum"
        grandTotal={toUnits(100)}
        amountToMinimum={toUnits(99)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('Shop for ₹99 more to place order')).toBeTruthy();
    expect(screen.queryByText('place_order')).toBeNull();
  });

  test('login: shows the login button', () => {
    render(
      <CheckoutBar
        state="login"
        grandTotal={toUnits(250)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('login_to_proceed')).toBeTruthy();
  });

  test('place: shows the place-order button with the grand total', () => {
    render(
      <CheckoutBar
        state="place"
        grandTotal={toUnits(250)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('place_order')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/shared/components/__tests__/CheckoutBar.test.tsx`
Expected: FAIL — passing `state="below_minimum"` and `amountToMinimum` is a type error at the call site (no such prop yet) and, at runtime, falls through to the existing `state !== 'place'` branch instead of rendering the nudge text.

- [ ] **Step 3: Add the `below_minimum` branch**

In `src/shared/components/CheckoutBar.tsx`, replace:

```tsx
interface CheckoutBarProps {
  state: CheckoutState;
  grandTotal: number;
  /** Selected address tag + one-line summary — shown in the 'place' state. */
  addressTag?: AddressTag;
  addressLine?: string;
  onLogin: () => void;
  onSelectAddress: () => void;
  onPlaceOrder: () => void;
}

export const CheckoutBar = ({
  state,
  grandTotal,
  addressTag,
  addressLine,
  onLogin,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutBarProps) => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  // States 'login' / 'address' are a single full-width green button.
  if (state !== 'place') {
```

with:

```tsx
interface CheckoutBarProps {
  state: CheckoutState;
  grandTotal: number;
  /** Rupee shortfall to the minimum order value — only used in the 'below_minimum' state. */
  amountToMinimum?: number;
  /** Selected address tag + one-line summary — shown in the 'place' state. */
  addressTag?: AddressTag;
  addressLine?: string;
  onLogin: () => void;
  onSelectAddress: () => void;
  onPlaceOrder: () => void;
}

export const CheckoutBar = ({
  state,
  grandTotal,
  amountToMinimum,
  addressTag,
  addressLine,
  onLogin,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutBarProps) => {
  const { t, tShopMoreToPlaceOrder, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  if (state === 'below_minimum') {
    const shortfall = amountToMinimum ?? 0;
    const progress = Math.min(1, grandTotal / (grandTotal + shortfall));

    return (
      <View style={styles.wrap}>
        <View style={styles.blockedBar}>
          <Text style={[styles.blockedText, teFont]}>
            {tShopMoreToPlaceOrder(rupees(shortfall))}
          </Text>
          <View style={styles.blockedProgressTrack}>
            <View style={[styles.blockedProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
    );
  }

  // States 'login' / 'address' are a single full-width green button.
  if (state !== 'place') {
```

Then add the new styles at the end of the `StyleSheet.create` call. Replace:

```ts
  cta: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
});
```

with:

```ts
  cta: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },

  blockedBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  blockedText: { color: '#64748b', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  blockedProgressTrack: {
    height: 3,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
    width: 160,
  },
  blockedProgressFill: { height: '100%', backgroundColor: '#94a3b8', borderRadius: 3 },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/shared/components/__tests__/CheckoutBar.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/CheckoutBar.tsx src/shared/components/__tests__/CheckoutBar.test.tsx
git commit -m "feat(cart): add blocked checkout-bar state for orders under the minimum"
```

---

### Task 7: Wire the gate into `CartScreen`

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx:101-104,310-318`

- [ ] **Step 1: Pass `belowMinimum` into `deriveCheckoutState`**

Replace:

```tsx
  const hasAddress = addr.selectedAddress != null;
  const checkoutState = deriveCheckoutState({
    isAuthenticated: addr.isAuthenticated,
    hasAddress,
  });
```

with:

```tsx
  const hasAddress = addr.selectedAddress != null;
  const checkoutState = deriveCheckoutState({
    isAuthenticated: addr.isAuthenticated,
    hasAddress,
    belowMinimum: vm.bill.belowMinimum,
  });
```

- [ ] **Step 2: Pass `amountToMinimum` into `CheckoutBar`**

Replace:

```tsx
      <CheckoutBar
        state={checkoutState}
        grandTotal={vm.bill.grandTotal}
        addressTag={addr.selectedAddress?.tag}
        addressLine={addressLine}
        onLogin={() => setSheet('login')}
        onSelectAddress={handleAddressPress}
        onPlaceOrder={handleCheckout}
      />
```

with:

```tsx
      <CheckoutBar
        state={checkoutState}
        grandTotal={vm.bill.grandTotal}
        amountToMinimum={vm.bill.amountToMinimum}
        addressTag={addr.selectedAddress?.tag}
        addressLine={addressLine}
        onLogin={() => setSheet('login')}
        onSelectAddress={handleAddressPress}
        onPlaceOrder={handleCheckout}
      />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat(cart): wire minimum-order gate into CartScreen"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS, no failures, no unexpected snapshot diffs.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no new errors introduced by this change (pre-existing warnings elsewhere in the repo are not this plan's concern).

- [ ] **Step 4: Confirm `ProductCartBar` is untouched**

Run: `git diff main -- src/features/product/views/components/ProductCartBar.tsx`
Expected: empty output (no changes to this file across the whole branch).

- [ ] **Step 5: Manual smoke test**

Start the app (`npx expo start`) and check, on Home/Categories/Search/CategoryDetails/TopPicks with items in the cart:
- Cart total under ₹199 → card shows nudge + progress bar + thumbnail stack.
- Add items to cross ₹199 → card switches to the "View cart →" row, no thumbnails.
- Tap the card in both states → navigates to `/cart`.
- On the Cart screen with total under ₹199 → checkout bar shows the blocked/gray state, not the green place-order button.
- Cross ₹199 in the Cart screen → checkout bar returns to its normal login/address/place flow.
