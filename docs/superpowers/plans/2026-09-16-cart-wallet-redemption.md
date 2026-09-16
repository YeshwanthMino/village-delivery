# Cart Wallet Redemption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer apply their real `/app/wallet` cashback balance to reduce the Cart page total, applied by default, and actually redeem it via the confirmed `useWallet: true` flag on `POST /app/orders`.

**Architecture:** Extend `computeBill()` with a wallet-aware discount that's excluded (along with the VIP fee) from the ₹199 minimum-order check; add a `WalletApplyCard` (mirroring `VipMembershipCard`'s controlled add/remove pattern) to the Cart screen, backed by the existing `useWalletQuery`; wire the resulting boolean into order placement and invalidate the wallet cache afterward. The VIP membership card is hidden from the Cart screen for this pass (unrelated cleanup, bundled per direct request).

**Tech Stack:** React Native, TypeScript, Zustand, TanStack Query (React Query), Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-16-cart-wallet-redemption-design.md`

---

### Task 1: `computeBill` — wallet discount, VIP fee and wallet excluded from the ₹199 minimum check

**Files:**
- Modify: `src/base/types/village.types.ts:102-121` (`Bill` interface)
- Modify: `src/features/cart/domain/bill.ts:124-158` (`computeBill`)
- Test: `src/features/cart/domain/__tests__/bill.test.ts`

- [ ] **Step 1: Add the failing tests**

Replace the existing `'the VIP fee can itself push a cart from belowMinimum to eligible'` test (it asserted the old, now-wrong behavior) and add a new `computeBill — wallet redemption` describe block. Open `src/features/cart/domain/__tests__/bill.test.ts` and make it read:

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

describe('computeBill — VIP membership add-on', () => {
  test('vipMembershipFee is 0 and excluded from grandTotal when not added', () => {
    const bill = computeBill([lineItem(250, 1)]);

    expect(bill.vipMembershipFee).toBe(0);
    expect(Math.round(bill.grandTotal * 20)).toBe(250);
  });

  test('adding VIP adds the ₹45 fee to vipMembershipFee and grandTotal', () => {
    const bill = computeBill([lineItem(250, 1)], { vipAdded: true });

    expect(Math.round(bill.vipMembershipFee * 20)).toBe(45);
    expect(Math.round(bill.grandTotal * 20)).toBe(295);
  });

  test('the VIP fee no longer helps clear the ₹199 minimum', () => {
    // ₹160 in items alone is below the ₹199 minimum. The fee still lands in
    // grandTotal (₹205), but it's excluded from the minimum-order check, so
    // this cart stays belowMinimum despite grandTotal clearing ₹199.
    const bill = computeBill([lineItem(160, 1)], { vipAdded: true });

    expect(bill.belowMinimum).toBe(true);
    expect(Math.round(bill.grandTotal * 20)).toBe(205);
  });

  test('VIP fee and a coupon discount apply together, fee first then discount', () => {
    // itemTotal ₹220 = 11 units, +₹45 VIP fee = 2.25 units → 13.25 units,
    // couponDiscount = min(11*0.1, 40/20) = 1.1 units (coupon is on itemTotal only).
    // grandTotal = 11 + 2.25 - 1.1 = 12.15 units = ₹243.
    const bill = computeBill([lineItem(220, 1)], { couponApplied: true, vipAdded: true });

    expect(Math.round(bill.grandTotal * 20)).toBe(243);
  });
});

describe('computeBill — wallet redemption', () => {
  test('walletDiscount is 0 when not applied, even if a balance is passed', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: false, walletBalance: toUnits(50) });

    expect(bill.walletDiscount).toBe(0);
    expect(Math.round(bill.grandTotal * 20)).toBe(250);
  });

  test('applying wallet subtracts the balance from grandTotal', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(bill.walletDiscount * 20)).toBe(50);
    expect(Math.round(bill.grandTotal * 20)).toBe(200);
  });

  test('wallet discount caps at the pre-wallet total, grandTotal never negative', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(400) });

    expect(Math.round(bill.walletDiscount * 20)).toBe(250);
    expect(bill.grandTotal).toBe(0);
  });

  test('a cart that clears ₹199 stays eligible even after wallet drops the total to ₹0', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(400) });

    expect(bill.belowMinimum).toBe(false);
    expect(bill.grandTotal).toBe(0);
  });

  test('totalSavings includes the wallet discount', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(bill.totalSavings * 20)).toBe(50);
  });
});
```

- [ ] **Step 2: Run the tests to verify the new/changed ones fail**

Run: `npx jest src/features/cart/domain/__tests__/bill.test.ts -v`
Expected: FAIL — `'the VIP fee no longer helps clear the ₹199 minimum'` fails (old code still lets the fee clear the minimum), and every test in `computeBill — wallet redemption` fails with `bill.walletDiscount` being `undefined`.

- [ ] **Step 3: Add `walletDiscount` to the `Bill` type**

In `src/base/types/village.types.ts`, add a field after `vipMembershipFee` (around line 111):

```ts
export interface Bill {
  itemTotal: number;
  mrpTotal: number;
  itemDiscount: number;
  deliveryFee: number;
  platformFee: number;
  couponDiscount: number;
  /** VIP membership fee (internal units) added to this order when the
   *  customer added VIP membership from the cart screen; 0 otherwise. */
  vipMembershipFee: number;
  /** Wallet/cashback amount redeemed against this order (internal units);
   *  0 when not applied. A best-effort display estimate — POST /app/orders'
   *  `useWallet` flag is boolean, so the backend decides the real amount
   *  deducted. Excluded from the ₹199 minimum-order check, same as
   *  vipMembershipFee — see minOrderValue/belowMinimum below. */
  walletDiscount: number;
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

- [ ] **Step 4: Rewrite `computeBill`**

In `src/features/cart/domain/bill.ts`, replace the `computeBill` function (lines 124-158) with:

```ts
export function computeBill(
  items: CartLineItem[],
  opts?: {
    couponApplied?: boolean;
    vipAdded?: boolean;
    /** Whether the customer's wallet balance is applied to this order. */
    walletApplied?: boolean;
    /** Cashback balance available to redeem, internal units. Ignored unless
     *  walletApplied is true. */
    walletBalance?: number;
  }
): Bill {
  let itemTotal = 0;
  let mrpTotal = 0;
  let totalCount = 0;

  for (const item of items) {
    itemTotal += item.price * item.count;
    mrpTotal += item.mrp * item.count;
    totalCount += item.count;
  }

  const itemDiscount = mrpTotal - itemTotal;
  const deliveryFee = 0;                           // delivery fee removed
  const platformFee = 0;
  const couponDiscount = opts?.couponApplied
    ? Math.min(itemTotal * 0.1, COUPON_CAP_RUPEES / UNITS_PER_RUPEE)
    : 0;
  // Added to the order's total the same way deliveryFee/platformFee are —
  // an earned/purchased add-on, not a per-item charge. Read from the same
  // store-config settings the cashback upsell copy quotes (sync getter: this
  // is a pure function, not a hook), so the two can't drift apart.
  const vipMembershipFee = opts?.vipAdded ? toUnits(getCashbackSettings().vipUpgradeFee) : 0;

  // The ₹199 minimum is about real product value — neither the VIP fee nor a
  // wallet redemption is product value, so both are excluded from this
  // check. The fee still lands in grandTotal below; it just can't help (or
  // hurt) eligibility for the minimum. Wallet is excluded so that redeeming
  // cashback a customer is entitled to can never block checkout.
  const minCheckBasis = itemTotal + deliveryFee + platformFee - couponDiscount;
  const { minOrderValue, belowMinimum, amountToMinimum } = deriveMinOrderFields(minCheckBasis);

  const grandTotalBeforeWallet = minCheckBasis + vipMembershipFee;
  // useWallet on POST /app/orders is boolean/all-or-nothing — the backend
  // decides the real amount deducted. This is a best-effort display estimate
  // only, deliberately uncapped by the minimum (see minCheckBasis above).
  const walletDiscount = opts?.walletApplied
    ? Math.min(opts.walletBalance ?? 0, grandTotalBeforeWallet)
    : 0;
  const grandTotal = grandTotalBeforeWallet - walletDiscount;
  const totalSavings = itemDiscount + couponDiscount + walletDiscount;

  return {
    itemTotal, mrpTotal, itemDiscount, deliveryFee, platformFee, couponDiscount, vipMembershipFee,
    walletDiscount, grandTotal, totalSavings, totalCount, minOrderValue, belowMinimum, amountToMinimum,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/features/cart/domain/__tests__/bill.test.ts -v`
Expected: PASS (all tests, including the 3 pre-existing describe blocks).

- [ ] **Step 6: Commit**

```bash
git add src/base/types/village.types.ts src/features/cart/domain/bill.ts src/features/cart/domain/__tests__/bill.test.ts
git commit -m "feat(cart): add wallet discount, exclude it and the VIP fee from the min-order check"
```

---

### Task 2: `useWalletQuery` — `alwaysFresh` option

**Files:**
- Modify: `src/features/wallet/data/queries/useWalletQuery.ts`
- Test: `src/features/wallet/data/queries/__tests__/useWalletQuery.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/features/wallet/data/queries/__tests__/useWalletQuery.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useWalletQuery } from '../useWalletQuery';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/src/core/store/useAuthStore', () => ({
  useAuthStore: jest.fn(selector => selector({ isAuthenticated: true })),
}));
jest.mock('../../walletApi', () => ({ getWallet: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;

describe('useWalletQuery', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue({ data: null });
  });

  test('defaults to normal caching — no forced refetch on mount', () => {
    renderHook(() => useWalletQuery());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnMount: undefined })
    );
  });

  test('alwaysFresh forces a refetch on every mount', () => {
    renderHook(() => useWalletQuery({ alwaysFresh: true }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnMount: 'always' })
    );
  });

  test('stays gated on isAuthenticated regardless of alwaysFresh', () => {
    renderHook(() => useWalletQuery({ alwaysFresh: true }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/wallet/data/queries/__tests__/useWalletQuery.test.ts -v`
Expected: FAIL — `useWalletQuery` takes no arguments yet, and `refetchOnMount` is never passed to `useQuery`.

- [ ] **Step 3: Add the `alwaysFresh` option**

Replace the full contents of `src/features/wallet/data/queries/useWalletQuery.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { getWallet } from '../walletApi';

interface UseWalletQueryOptions {
  /** Force a fresh server fetch on every mount instead of trusting a cached
   *  value — for surfaces (like the Cart screen) where the balance directly
   *  affects real money and a figure cached from an earlier Profile visit
   *  would be wrong to trust. Cached data (if any) still paints instantly;
   *  this only controls whether a revalidation fires alongside it. */
  alwaysFresh?: boolean;
}

// The wallet is per-user and the endpoint 401s without a token, so only fetch
// once signed in. Signing out resets the auth store, which disables this query.
export const useWalletQuery = (opts?: UseWalletQueryOptions) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.wallet.detail(),
    queryFn: () => getWallet(),
    enabled: isAuthenticated,
    refetchOnMount: opts?.alwaysFresh ? 'always' : undefined,
  });
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/features/wallet/data/queries/__tests__/useWalletQuery.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/wallet/data/queries/useWalletQuery.ts src/features/wallet/data/queries/__tests__/useWalletQuery.test.ts
git commit -m "feat(wallet): add alwaysFresh option to useWalletQuery"
```

---

### Task 3: `orderApi.createOrder` — send `useWallet`

**Files:**
- Modify: `src/features/cart/data/orderApi.ts`
- Test: `src/features/cart/__tests__/cartCheckout.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the end of the `describe('Cart Checkout with Stock Conflicts', ...)` block in `src/features/cart/__tests__/cartCheckout.integration.test.ts` (just before its closing `});`):

```ts
  test('includes useWallet: true in the request body when set', async () => {
    mockApiClient.post.mockResolvedValue({ _id: 'order127' });

    await createOrder({
      products: [{ productId: 'prod1', quantity: 1 }],
      address: 'addr123',
      paymentMethod: 'cod',
      useWallet: true,
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/app/orders'),
      expect.objectContaining({ useWallet: true })
    );
  });

  test('defaults useWallet to false when omitted', async () => {
    mockApiClient.post.mockResolvedValue({ _id: 'order128' });

    await createOrder({
      products: [{ productId: 'prod1', quantity: 1 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/app/orders'),
      expect.objectContaining({ useWallet: false })
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/cart/__tests__/cartCheckout.integration.test.ts -v`
Expected: FAIL — the request body never includes a `useWallet` key.

- [ ] **Step 3: Add `useWallet` to `CreateOrderInput` and the request body**

In `src/features/cart/data/orderApi.ts`, modify the `CreateOrderInput` interface (lines 27-36):

```ts
export interface CreateOrderInput {
  products: OrderProductInput[];
  /** Saved address id (the server `_id` carried as Address.id). */
  address: string;
  /** How the customer pays. The server requires the payment flags below. */
  paymentMethod: 'cod' | 'upi';
  scheduledOn?: string;
  notes?: string;
  isPriority?: boolean;
  /** Redeem the customer's wallet/cashback balance against this order.
   *  Boolean/all-or-nothing on the backend — it decides the real amount
   *  deducted, not this app. Defaults to false. */
  useWallet?: boolean;
}
```

Then modify the `body` construction inside `createOrder` (lines 47-59):

```ts
  const body = {
    products: input.products.map((p) => ({
      productId: p.productId,
      ...(p.variantId ? { variantId: p.variantId } : {}),
      quantity: p.quantity,
      hasFreeItem: p.hasFreeItem ?? false,
    })),
    address: input.address,
    preferredPaymentMethod: input.paymentMethod,
    scheduledOn: input.scheduledOn,
    notes: input.notes,
    isPriority: input.isPriority ?? false,
    useWallet: input.useWallet ?? false,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/cart/__tests__/cartCheckout.integration.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/data/orderApi.ts src/features/cart/__tests__/cartCheckout.integration.test.ts
git commit -m "feat(cart): send useWallet on order placement"
```

---

### Task 4: `useCreateOrderMutation` — invalidate the wallet cache on success

**Files:**
- Modify: `src/features/cart/data/mutations/useCreateOrderMutation.ts`
- Test: `src/features/cart/data/mutations/__tests__/useCreateOrderMutation.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/features/cart/data/mutations/__tests__/useCreateOrderMutation.test.tsx`, inside the `describe('useCreateOrderMutation', ...)` block, right after the existing `'invalidates the orders cache when an order is actually placed'` test:

```ts
  test('invalidates the wallet cache when an order is actually placed', async () => {
    mockCreateOrder.mockResolvedValue({ orderId: 'o1', raw: {} });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet.all });
  });

  test('does not invalidate the wallet cache when the response is a stock conflict', async () => {
    mockCreateOrder.mockResolvedValue({
      orderId: null,
      raw: {},
      stockInfo: [{ productId: 'p1', availableStock: 0 }],
    });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.wallet.all });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/cart/data/mutations/__tests__/useCreateOrderMutation.test.tsx -v`
Expected: FAIL — `invalidateSpy` is never called with `queryKeys.wallet.all`.

- [ ] **Step 3: Invalidate the wallet cache alongside orders**

In `src/features/cart/data/mutations/useCreateOrderMutation.ts`, replace the `onSuccess` callback:

```ts
    onSuccess: (result) => {
      if (result.orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        // The backend, not this app, decides how much wallet balance a
        // useWallet:true order actually consumed — refetch so the next read
        // (Cart or Profile) shows the real post-order balance.
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      }
    },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/cart/data/mutations/__tests__/useCreateOrderMutation.test.tsx -v`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/data/mutations/useCreateOrderMutation.ts src/features/cart/data/mutations/__tests__/useCreateOrderMutation.test.tsx
git commit -m "feat(cart): refetch wallet balance after placing an order"
```

---

### Task 5: Translations — wallet card copy

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add the new keys**

In `src/base/constants/translations.ts`, add three keys right after the existing `wallet_cashback_expiry` line (around line 281):

```ts
  wallet_cashback_label:  { te: 'క్యాష్‌బ్యాక్ బ్యాలెన్స్', en: 'Cashback balance' },
  wallet_cashback_expiry: { te: '{n} రోజుల్లో గడువు ముగుస్తుంది', en: 'Expires in {n} days' },
  wallet_apply_title:     { te: 'వాలెట్ బ్యాలెన్స్', en: 'Wallet balance' },
  wallet_apply_available: { te: '{n} క్యాష్‌బ్యాక్ అందుబాటులో ఉంది', en: '{n} cashback available' },
  wallet_apply_applied:   { te: '{n} ఈ ఆర్డర్‌కు వర్తింపజేయబడింది', en: '{n} applied to this order' },
```

(Only the three new lines are additions — `wallet_cashback_label` and `wallet_cashback_expiry` already exist and are shown here for placement context.)

- [ ] **Step 2: Verify the file still parses**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No new type errors (the file is a plain object literal — this just confirms no syntax mistake was introduced).

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(i18n): add wallet apply/applied copy for the cart wallet card"
```

---

### Task 6: `BillSummaryCard` — wallet discount row

**Files:**
- Modify: `src/shared/components/BillSummaryCard.tsx`
- Test: `src/shared/components/__tests__/BillSummaryCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/shared/components/__tests__/BillSummaryCard.test.tsx`: first add `wallet_apply_title: 'Wallet balance'` to `mockRawTemplates`, then add these tests at the end of the `describe('BillSummaryCard', ...)` block:

```ts
  test('shows a wallet discount line item when wallet is applied', () => {
    const withWallet = bill({
      itemTotal: toUnits(250),
      mrpTotal: toUnits(250),
      walletDiscount: toUnits(50),
      grandTotal: toUnits(200),
    });

    render(<BillSummaryCard bill={withWallet} couponApplied={false} walletApplied={true} />);

    expect(screen.getByText('Wallet balance')).toBeTruthy();
    expect(screen.getByText('-₹50')).toBeTruthy();
    expect(screen.getByText('₹200')).toBeTruthy(); // To Pay reflects the discount
  });

  test('hides the wallet row when walletApplied is false, even if walletDiscount is set', () => {
    const withWallet = bill({ walletDiscount: toUnits(50) });

    render(<BillSummaryCard bill={withWallet} couponApplied={false} walletApplied={false} />);

    expect(screen.queryByText('Wallet balance')).toBeNull();
  });

  test('hides the wallet row when walletDiscount is 0, even if walletApplied is true', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={true} />);

    expect(screen.queryByText('Wallet balance')).toBeNull();
  });
```

Also add `walletDiscount: 0,` to the `bill()` helper's default object (it currently omits it, which will fail to type-check once `Bill` requires the field):

```ts
function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    itemTotal: toUnits(800),
    mrpTotal: toUnits(800),
    itemDiscount: 0,
    deliveryFee: 0,
    platformFee: 0,
    couponDiscount: 0,
    vipMembershipFee: 0,
    walletDiscount: 0,
    grandTotal: toUnits(800),
    totalSavings: 0,
    totalCount: 1,
    minOrderValue: toUnits(199),
    belowMinimum: false,
    amountToMinimum: 0,
    ...overrides,
  };
}
```

`walletApplied` becomes a required prop in Step 3, so every pre-existing render call in this file needs it too. Every one of those calls currently contains the literal substring `couponApplied={false}` — do a find-and-replace across the file, replacing every occurrence of:

```tsx
couponApplied={false}
```

with:

```tsx
couponApplied={false} walletApplied={false}
```

This touches all 7 pre-existing `<BillSummaryCard .../>` calls in the file (the ones in `'shows the earned-cashback row...'`, `'hides the cashback row...'`, `'a VIP sees the doubled reward...'`, `'renders no cashback row...'`, `'the bill total and MRP rows...'`, `'shows a VIP Membership line item...'`, and `'hides the VIP Membership row...'`) and does not touch the 3 new calls added above, which already pass `walletApplied` explicitly.

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx jest src/shared/components/__tests__/BillSummaryCard.test.tsx -v`
Expected: FAIL — TypeScript/prop-types error or missing "Wallet balance" text, since `BillSummaryCard` doesn't accept `walletApplied` yet.

- [ ] **Step 3: Add the `walletApplied` prop and row**

In `src/shared/components/BillSummaryCard.tsx`, update the props interface and component:

```tsx
interface BillSummaryCardProps {
  bill: Bill;
  couponApplied: boolean;
  walletApplied: boolean;
  /** Formatted rupee string (e.g. "₹25") for an already-unlocked cashback
   *  reward. Opt-in: omit (or pass null) to keep the row hidden — e.g. on
   *  OrderDetailScreen, where a past order carries no real cashback data
   *  and must never show a promise computed from today's settings. */
  cashbackReward?: string | null;
}

export const BillSummaryCard = ({ bill, couponApplied, walletApplied, cashbackReward }: BillSummaryCardProps) => {
  const { t } = useTranslation();

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Receipt size={16} color="#64748b" />
        <Text className="text-slate-500 text-xs font-bold tracking-wider">{t('bill_summary')}</Text>
      </View>

      <BillRow label={t('item_total_mrp')} value={rupees(bill.mrpTotal)} />
      {bill.itemDiscount > 0 && (
        <BillRow label={t('discount_on_mrp')} value={`-${rupees(bill.itemDiscount)}`} isGreen />
      )}
      {couponApplied && bill.couponDiscount > 0 && (
        <BillRow label={t('coupon_label')} value={`-${rupees(bill.couponDiscount)}`} isGreen />
      )}
      {walletApplied && bill.walletDiscount > 0 && (
        <BillRow label={t('wallet_apply_title')} value={`-${rupees(bill.walletDiscount)}`} isGreen />
      )}
      {bill.vipMembershipFee > 0 && (
        <BillRow label={t('vip_membership_title')} value={rupees(bill.vipMembershipFee)} />
      )}

      <View className="border-t border-dashed border-slate-300 my-2" />

      <BillRow label={t('to_pay')} value={rupees(bill.grandTotal)} isBold />

      {bill.totalSavings > 0 && (
        <View className="bg-green-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-green-700 text-xs font-medium text-center">
            {interpolate(t('you_saved_order'), rupees(bill.totalSavings))}
          </Text>
        </View>
      )}

      {/* Cashback is earned, not a discount — it never touches grandTotal
       *  above. Shown only once a tier is actually unlocked. */}
      {cashbackReward && (
        <View className="bg-emerald-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-emerald-700 text-xs font-medium text-center">
            {interpolateVars(t('bill_cashback_earn'), { r: cashbackReward })}
          </Text>
        </View>
      )}
    </View>
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/shared/components/__tests__/BillSummaryCard.test.tsx -v`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/BillSummaryCard.tsx src/shared/components/__tests__/BillSummaryCard.test.tsx
git commit -m "feat(cart): show a wallet discount row in the bill summary"
```

---

### Task 7: `WalletApplyCard` component

**Files:**
- Create: `src/shared/components/WalletApplyCard.tsx`
- Modify: `src/shared/components/index.ts`
- Test: `src/shared/components/__tests__/WalletApplyCard.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/__tests__/WalletApplyCard.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WalletApplyCard } from '../WalletApplyCard';
import { toUnits } from '@/src/shared/utils/currency';

const mockRawTemplates: Record<string, string> = {
  wallet_apply_title: 'Wallet balance',
  wallet_apply_available: '{n} cashback available',
  wallet_apply_applied: '{n} applied to this order',
  apply: 'APPLY',
  remove: 'REMOVE',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('WalletApplyCard', () => {
  test('hides when balance is null', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={null} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('hides when balance is 0', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={0} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('hides when balance is undefined (still loading, errored, or unauthenticated)', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={undefined} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('not applied: shows the available amount and an APPLY button', () => {
    render(
      <WalletApplyCard balance={toUnits(50)} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );

    expect(screen.getByText('Wallet balance')).toBeTruthy();
    expect(screen.getByText('₹50 cashback available')).toBeTruthy();
    expect(screen.getByText('APPLY')).toBeTruthy();
    expect(screen.queryByText('REMOVE')).toBeNull();
  });

  test('tapping the card while not applied calls onApply', () => {
    const onApply = jest.fn();
    render(
      <WalletApplyCard balance={toUnits(50)} applied={false} onApply={onApply} onRemove={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('wallet-apply-card'));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  test('applied: shows the applied amount and a REMOVE button', () => {
    render(
      <WalletApplyCard balance={toUnits(50)} applied={true} onApply={jest.fn()} onRemove={jest.fn()} />
    );

    expect(screen.getByText('₹50 applied to this order')).toBeTruthy();
    expect(screen.getByText('REMOVE')).toBeTruthy();
    expect(screen.queryByText('APPLY')).toBeNull();
  });

  test('tapping the card while applied calls onRemove', () => {
    const onRemove = jest.fn();
    render(
      <WalletApplyCard balance={toUnits(50)} applied={true} onApply={jest.fn()} onRemove={onRemove} />
    );

    fireEvent.press(screen.getByTestId('wallet-apply-card'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/shared/components/__tests__/WalletApplyCard.test.tsx -v`
Expected: FAIL — `Cannot find module '../WalletApplyCard'`.

- [ ] **Step 3: Create the component**

Create `src/shared/components/WalletApplyCard.tsx`:

```tsx
// src/shared/components/WalletApplyCard.tsx
//
// Cart-screen wallet redemption card — mirrors VipMembershipCard's controlled
// add/remove pattern. The screen decides `applied` (defaulting it to true
// once a balance is known, see useCartViewModel) and owns the toggle; this
// component only renders whichever state it's told.
//
// POST /app/orders' `useWallet` flag is boolean/all-or-nothing — the backend
// decides the real amount deducted. `balance` here is this app's best-effort
// display estimate, from the same /app/wallet read WalletCard (Profile) uses.

import { Wallet } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { rupees } from '@/src/shared/utils/currency';

interface WalletApplyCardProps {
  /** Cashback balance, internal units. null/undefined/<=0 hides the card —
   *  covers "no wallet", "still loading", "query failed", and "logged out"
   *  alike, since none of those are confident enough to offer redemption on. */
  balance: number | null | undefined;
  applied: boolean;
  onApply: () => void;
  onRemove: () => void;
}

export const WalletApplyCard = ({ balance, applied, onApply, onRemove }: WalletApplyCardProps) => {
  const { t } = useTranslation();

  if (balance == null || balance <= 0) return null;

  const amountText = rupees(balance);

  if (applied) {
    return (
      <TouchableOpacity
        testID="wallet-apply-card"
        onPress={onRemove}
        activeOpacity={0.9}
        className="bg-cyan-50 border border-cyan-300 rounded-2xl p-3 flex-row items-center gap-3"
      >
        <View className="w-11 h-11 rounded-xl bg-cyan-100 items-center justify-center">
          <Wallet size={20} color="#0e7490" />
        </View>
        <View className="flex-1">
          <Text className="text-cyan-900 font-bold text-sm">{t('wallet_apply_title')}</Text>
          <Text className="text-cyan-700 text-xs mt-0.5">
            {interpolate(t('wallet_apply_applied'), amountText)}
          </Text>
        </View>
        <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
          <Text className="text-green-700 font-bold text-sm">{t('remove')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID="wallet-apply-card"
      onPress={onApply}
      activeOpacity={0.9}
      className="bg-white border border-cyan-200 rounded-2xl p-3 flex-row items-center gap-3"
    >
      <View className="w-11 h-11 rounded-xl bg-cyan-50 items-center justify-center">
        <Wallet size={20} color="#0284c7" />
      </View>
      <View className="flex-1">
        <Text className="text-cyan-950 font-bold text-sm">{t('wallet_apply_title')}</Text>
        <Text className="text-cyan-700 text-xs mt-0.5">
          {interpolate(t('wallet_apply_available'), amountText)}
        </Text>
      </View>
      <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
        <Text className="text-green-700 font-bold text-sm">{t('apply')}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

- [ ] **Step 4: Export it from the shared components barrel**

In `src/shared/components/index.ts`, add a line near the other cart-adjacent exports (next to `VipMembershipCard`):

```ts
export { VipMembershipCard } from './VipMembershipCard';
export { WalletApplyCard } from './WalletApplyCard';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/shared/components/__tests__/WalletApplyCard.test.tsx -v`
Expected: PASS (all 7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/WalletApplyCard.tsx src/shared/components/index.ts src/shared/components/__tests__/WalletApplyCard.test.tsx
git commit -m "feat(cart): add WalletApplyCard component"
```

---

### Task 8: `useCartViewModel` — wire wallet state

**Files:**
- Modify: `src/features/cart/viewmodel/useCartViewModel.ts`
- Test: `src/features/cart/viewmodel/__tests__/useCartViewModel.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `src/features/cart/viewmodel/__tests__/useCartViewModel.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { toUnits } from '@/src/shared/utils/currency';

let mockWalletData: { cashback: number } | null | undefined = undefined;

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector => selector({
    cart: { 'prod-1': 1 },
    cartSnapshots: {
      'prod-1': {
        key: 'prod-1', productId: 'prod-1', variantIndex: null,
        name: 'Test', weight: '1 pc', price: toUnits(250), mrp: toUnits(250),
      },
    },
    addToCart: jest.fn(),
    decFromCart: jest.fn(),
    setQuantity: jest.fn(),
    clearCart: jest.fn(),
    vipAddedInCart: false,
    addVipMembership: jest.fn(),
    removeVipMembership: jest.fn(),
  })),
  selectCartCount: jest.fn(() => 1),
}));

jest.mock('@/src/features/wallet/data/queries/useWalletQuery', () => ({
  useWalletQuery: jest.fn(() => ({ data: mockWalletData })),
}));

import { useCartViewModel } from '../useCartViewModel';

describe('useCartViewModel — wallet', () => {
  afterEach(() => {
    mockWalletData = undefined;
  });

  test('walletBalance is null when there is no wallet data', () => {
    mockWalletData = undefined;
    const { result } = renderHook(() => useCartViewModel());

    expect(result.current.walletBalance).toBeNull();
    expect(result.current.walletApplied).toBe(false);
  });

  test('walletBalance is null when cashback is 0', () => {
    mockWalletData = { cashback: 0 };
    const { result } = renderHook(() => useCartViewModel());

    expect(result.current.walletBalance).toBeNull();
  });

  test('a positive balance is applied automatically', () => {
    mockWalletData = { cashback: toUnits(50) };
    const { result } = renderHook(() => useCartViewModel());

    expect(result.current.walletBalance).toBe(toUnits(50));
    expect(result.current.walletApplied).toBe(true);
    expect(Math.round(result.current.bill.walletDiscount * 20)).toBe(50);
  });

  test('removeWallet turns it off, and it stays off across a rerender', () => {
    mockWalletData = { cashback: toUnits(50) };
    const { result, rerender } = renderHook(() => useCartViewModel());

    act(() => result.current.removeWallet());
    expect(result.current.walletApplied).toBe(false);

    rerender();
    expect(result.current.walletApplied).toBe(false);
    expect(result.current.bill.walletDiscount).toBe(0);
  });

  test('applyWallet turns it back on', () => {
    mockWalletData = { cashback: toUnits(50) };
    const { result } = renderHook(() => useCartViewModel());

    act(() => result.current.removeWallet());
    act(() => result.current.applyWallet());

    expect(result.current.walletApplied).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/cart/viewmodel/__tests__/useCartViewModel.test.ts -v`
Expected: FAIL — `result.current.walletBalance`, `walletApplied`, `applyWallet`, `removeWallet` are all `undefined`.

- [ ] **Step 3: Wire wallet state into the view model**

Replace the full contents of `src/features/cart/viewmodel/useCartViewModel.ts`:

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore, selectCartCount } from '@/src/core/store';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { useWalletQuery } from '@/src/features/wallet/data/queries/useWalletQuery';

export const useCartViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const setQuantity = useVillageStore(state => state.setQuantity);
  const clearCart = useVillageStore(state => state.clearCart);
  const cartCount = useVillageStore(selectCartCount);
  const vipAdded = useVillageStore(state => state.vipAddedInCart);
  const addVipMembership = useVillageStore(state => state.addVipMembership);
  const removeVipMembership = useVillageStore(state => state.removeVipMembership);

  const [couponApplied, setCouponApplied] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  // Real /app/wallet balance — always revalidated on mount since this
  // directly affects real money at checkout (see useWalletQuery's alwaysFresh).
  const { data: wallet } = useWalletQuery({ alwaysFresh: true });
  const walletBalance = wallet && wallet.cashback > 0 ? wallet.cashback : null;

  const [walletApplied, setWalletApplied] = useState(false);
  // Applies the balance automatically the first time it's known to be
  // positive, and only then — so a customer who taps Remove keeps it removed
  // even if the query refetches again in the background this session.
  const walletAutoAppliedOnce = useRef(false);
  useEffect(() => {
    if (!walletAutoAppliedOnce.current && walletBalance != null) {
      walletAutoAppliedOnce.current = true;
      setWalletApplied(true);
    }
  }, [walletBalance]);

  const cartItems = useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);

  const walletAppliedEffective = walletApplied && walletBalance != null;

  const bill = useMemo(() =>
    computeBill(cartItems, {
      couponApplied,
      vipAdded,
      walletApplied: walletAppliedEffective,
      walletBalance: walletBalance ?? 0,
    }),
    [cartItems, couponApplied, vipAdded, walletAppliedEffective, walletBalance]
  );

  return {
    cartItems,
    bill,
    cartCount,
    couponApplied,
    toggleCoupon: () => setCouponApplied(v => !v),
    vipAdded,
    addVipMembership,
    removeVipMembership,
    walletBalance,
    walletApplied: walletAppliedEffective,
    applyWallet: () => setWalletApplied(true),
    removeWallet: () => setWalletApplied(false),
    variantProduct,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    addToCart,
    decFromCart,
    setQuantity,
    clearCart,
  };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/cart/viewmodel/__tests__/useCartViewModel.test.ts -v`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/viewmodel/useCartViewModel.ts src/features/cart/viewmodel/__tests__/useCartViewModel.test.ts
git commit -m "feat(cart): wire wallet balance and default-applied state into useCartViewModel"
```

---

### Task 9: `CartScreen` — hide VIP card, show wallet card, wire order placement

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx`

- [ ] **Step 1: Swap the import**

In `src/features/cart/views/CartScreen.tsx`, replace the `@/src/shared/components` import block (lines 7-19):

```tsx
import {
  BillSummaryCard,
  CartItemRow,
  CashbackProgressBanner,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  OrderModificationSheet,
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
  WalletApplyCard,
} from '@/src/shared/components';
```

- [ ] **Step 2: Replace the VIP card with the wallet card**

Replace the VIP membership block (lines 293-298):

```tsx
          {/* VIP membership — addable like a product line item */}
          <VipMembershipCard
            added={vm.vipAdded}
            onAdd={vm.addVipMembership}
            onRemove={vm.removeVipMembership}
          />
```

with:

```tsx
          {/* Wallet balance — addable like a product line item, applied by
              default when a balance exists (see useCartViewModel). VIP
              membership upsell is hidden here for now, unrelated to wallet. */}
          <WalletApplyCard
            balance={vm.walletBalance}
            applied={vm.walletApplied}
            onApply={vm.applyWallet}
            onRemove={vm.removeWallet}
          />
```

- [ ] **Step 3: Pass `walletApplied` to `BillSummaryCard`**

Replace line 319:

```tsx
          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} cashbackReward={cashback.unlockedReward} />
```

with:

```tsx
          <BillSummaryCard
            bill={vm.bill}
            couponApplied={vm.couponApplied}
            walletApplied={vm.walletApplied}
            cashbackReward={cashback.unlockedReward}
          />
```

- [ ] **Step 4: Send `useWallet` on order placement**

In `handlePlaceOrder`, replace the `createOrderMutation.mutateAsync` call (lines 157-167):

```tsx
      const result = await createOrderMutation.mutateAsync({
        products: vm.cartItems.map(item => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.count,
          hasFreeItem: item.hasFreeItem,
        })),
        address: addressId,
        paymentMethod: paymentMethod ?? 'cod',
        isPriority: false,
        useWallet: vm.walletApplied && vm.bill.walletDiscount > 0,
      });
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors — in particular, no leftover reference to `VipMembershipCard` (which is no longer imported) anywhere else in this file.

- [ ] **Step 6: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat(cart): show the wallet card on the cart screen, hide VIP membership for now"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS — every suite green, including all the ones touched above (`bill.test.ts`, `useWalletQuery.test.ts`, `cartCheckout.integration.test.ts`, `useCreateOrderMutation.test.tsx`, `BillSummaryCard.test.tsx`, `WalletApplyCard.test.tsx`, `useCartViewModel.test.ts`) and everything untouched (e.g. `VipMembershipCard.test.tsx`, `cartPricing.integration.test.ts`, `cartProgress.test.ts`).

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors.

- [ ] **Step 3: Manual smoke check (simulator/device required — flag if unavailable)**

With a signed-in test account carrying a positive cashback balance (per the wallet screen's own staging notes, e.g. the "Gopi Guri" account or an equivalent one on `staging-api.villagedelivery.in`):
1. Add items to the cart totaling more than ₹199.
2. Open the Cart screen — confirm the Wallet balance card appears already in the "applied" state (teal, "Remove" button) and the bill summary shows a green "Wallet balance −₹NN" row with "To Pay" reduced accordingly.
3. Tap **Remove** — confirm the card switches to "Apply" and the bill summary's wallet row disappears, "To Pay" goes back up.
4. Tap the card again to re-apply, then place the order (COD) — confirm the order succeeds and, back on Profile, the Wallet card's balance reflects the real post-order figure from the server (may require a manual refresh if the Profile screen was already mounted from before the order).
5. Confirm the VIP Membership card no longer appears anywhere on the Cart screen.

If no simulator/device is available in this environment, state that explicitly rather than claiming this step passed.
