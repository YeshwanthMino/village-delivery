import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshotRecord } from '@/src/base/types/village.types';

let mockCart: CartRecord = { p1: 1 };
let mockSnapshots: CartSnapshotRecord = {
  p1: {
    key: 'p1',
    productId: 'p1',
    variantIndex: null,
    name: 'Product p1',
    weight: '1 pc',
    price: toUnits(250),
    mrp: toUnits(285), // saved ₹35
    emoji: '🍪',
  },
};

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
  useAuthStore: jest.fn(selector => selector({ user: { isVip: false } })),
}));

// active: false, so getCartProgressState returns phase 'disabled' and the
// card must fall back to its pre-cashback ternary exactly as before.
jest.mock('@/src/features/cart/domain/cashbackConfig', () => ({
  CASHBACK_SETTINGS: {
    active: false,
    isDeleted: false,
    minOrderValue: 199,
    vipUpgradeFee: 45,
    monthlyCap: 500,
    activationDelay: '1d',
    expiryPeriod: '2mo',
    vipMonthlySpendTarget: 2500,
    tiers: [],
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

describe('CartSummaryCard — cashback disabled (kill switch)', () => {
  test('falls back to the pre-cashback savings line, with no VIP upsell', () => {
    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('SAVED ₹35')).toBeTruthy();
    expect(screen.queryByText(/Add VIP for/)).toBeNull();
  });
});
