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
