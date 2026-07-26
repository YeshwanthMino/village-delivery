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

// jest.mock factories can only reference out-of-scope variables prefixed
// with "mock" (Jest's hoisting rule) — hence the name here.
const mockRawTemplates: Record<string, string> = {
  order_ready_to_place: 'Ready to place your order!',
  shop_more_to_place_order: 'Shop for {n} more to place order',
  saved_amount: 'SAVED {n}',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => mockRawTemplates[key] ?? key,
    tCartSummaryCount: (n: number) => `${n} ITEMS`,
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

  test('below minimum: shows count, total, the nudge message, and the icon', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 100) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹100')).toBeTruthy();
    expect(screen.getByText('Shop for ₹99 more to place order')).toBeTruthy();
    expect(screen.getByTestId('cart-summary-icon')).toBeTruthy();
  });

  test('at/above minimum with no discount: keeps the same compact card, no shortfall/savings line, no bottom-bar CTA', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) }; // mrp === price, no savings

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getByText('Ready to place your order!')).toBeTruthy();
    expect(screen.queryByText(/Shop for/)).toBeNull();
    expect(screen.queryByText(/SAVED/)).toBeNull();
    expect(screen.queryByText('View cart →')).toBeNull();
  });

  test('at/above minimum with a discount: shows only the saved amount, no "ready to place" line', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250, { mrp: toUnits(285) }) }; // saved ₹35

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('SAVED ₹35')).toBeTruthy();
    expect(screen.queryByText('Ready to place your order!')).toBeNull();
    expect(screen.queryByText(/Shop for/)).toBeNull();
  });

  test('shows the most-recently-added item as the icon', () => {
    mockCart = { p1: 1, p2: 1 };
    mockSnapshots = {
      p1: snapshot('p1', 20, { emoji: '🥛' }),
      p2: snapshot('p2', 20, { emoji: '🍎' }),
    };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('🍎')).toBeTruthy();
    expect(screen.queryByText('🥛')).toBeNull();
  });

  test('falls back to emoji when the item has no image', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 20, { imageUrl: undefined, emoji: '🥛' }) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('🥛')).toBeTruthy();
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
