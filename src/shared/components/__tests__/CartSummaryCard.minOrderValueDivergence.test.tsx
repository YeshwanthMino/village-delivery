import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshotRecord } from '@/src/base/types/village.types';

// Regression test for the finding where showCashback trusted only
// cashback.phase !== 'disabled', so a future divergence between bill.ts's
// hardcoded minOrderValue (₹199) and cashbackConfig.ts's own (independently
// hardcoded, today also ₹199) could render the cashback "shop more" branch
// on a cart that already clears bill.ts's minimum and can be checked out.
//
// Cart total here is ₹300 — above bill.ts's real ₹199 minimum (so
// bill.belowMinimum is false) but below the mocked cashback minOrderValue
// of ₹500 (so cashback.phase is 'below_minimum').
const mockCart: CartRecord = { p1: 1 };
const mockSnapshots: CartSnapshotRecord = {
  p1: {
    key: 'p1',
    productId: 'p1',
    variantIndex: null,
    name: 'Product p1',
    weight: '1 pc',
    price: toUnits(300),
    mrp: toUnits(300), // no MRP savings — isolates the below_minimum branch
    emoji: '🍪',
  },
};

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
  useAuthStore: jest.fn(selector => selector({ user: { isVip: false } })),
}));

jest.mock('@/src/features/cart/domain/cashbackConfig', () => ({
  CASHBACK_SETTINGS: {
    active: true,
    isDeleted: false,
    minOrderValue: 500,
    vipUpgradeFee: 45,
    monthlyCap: 500,
    activationDelay: '1d',
    expiryPeriod: '2mo',
    vipMonthlySpendTarget: 2500,
    tiers: [{ amount: 750, standardReward: 25, vipReward: 50 }],
  },
  STORE_TIMINGS: { opensAt: '07:00', closesAt: '20:00' },
}));

const mockRawTemplates: Record<string, string> = {
  order_ready_to_place: 'Ready to place your order!',
  shop_more_to_place_order: 'Shop for {n} more to place order',
  saved_amount: 'SAVED {n}',
  view_cart: 'View cart',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => mockRawTemplates[key] ?? key,
    tCartSummaryCount: (n: number) => `${n} ITEMS`,
  }),
}));

describe('CartSummaryCard — cashback minOrderValue diverges from bill.ts minOrderValue', () => {
  test('does not show the cashback "shop more" text when the cart already clears the real checkout minimum', () => {
    render(<CartSummaryCard onPress={jest.fn()} />);

    // Correct behaviour: bill.belowMinimum is false and there are no savings,
    // so the card falls through to the plain "ready to place" line.
    expect(screen.getByText('Ready to place your order!')).toBeTruthy();

    // Bug behaviour: showCashback stayed true because it only checked
    // `!== 'disabled'`, so the cashback below_minimum branch rendered its own
    // shortfall amount (₹200 = 500 - 300) inside "Shop for {n} more...".
    expect(screen.queryByText('₹200')).toBeNull();
  });
});
