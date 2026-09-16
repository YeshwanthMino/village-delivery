import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshot, CartSnapshotRecord } from '@/src/base/types/village.types';

let mockCart: CartRecord = {};
let mockSnapshots: CartSnapshotRecord = {};
let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

// jest.mock factories can only reference out-of-scope variables prefixed
// with "mock" (Jest's hoisting rule) — hence the name here.
const mockRawTemplates: Record<string, string> = {
  order_ready_to_place: 'Ready to place your order!',
  shop_more_to_place_order: 'Shop for {n} more to place order',
  saved_amount: 'SAVED {n}',
  cashback_shop_more: 'Shop {n} more to get {r} cashback',
  cashback_max_unlocked: 'Max cashback unlocked · {r}',
  view_cart: 'View cart',
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
    mockUser = null;
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
    expect(screen.getByText('View cart')).toBeTruthy();
    expect(screen.getByText('₹99')).toBeTruthy();
    expect(screen.getByTestId('cart-summary-icon')).toBeTruthy();
  });

  test('toward first tier: shows cashback progress only — no VIP upsell in the snackbar', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) }; // mrp === price, no MRP savings
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getByText('₹500')).toBeTruthy(); // shortfall to ₹750
    expect(screen.getByText('₹25')).toBeTruthy(); // tier-1 standard reward
    // The VIP upsell (fee + doubled reward) now lives only on the cart
    // screen's CashbackProgressBanner — the snackbar stays tier-progress only.
    expect(screen.queryByText('₹45')).toBeNull();
    expect(screen.queryByText('₹50')).toBeNull();
    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
    expect(screen.queryByText('Ready to place your order!')).toBeNull();
    expect(screen.queryByText(/SAVED/)).toBeNull();
  });

  test('tier unlocked: counts down to the next tier, not the one already achieved', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹700')).toBeTruthy(); // shortfall to ₹1500
    expect(screen.getByText('₹50')).toBeTruthy(); // tier-2 standard reward
    expect(screen.queryByText('₹25')).toBeNull(); // already-unlocked reward not shown here
    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
  });

  test('max tier: shows the max-unlocked line, no VIP upsell', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 8000) };
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹250')).toBeTruthy(); // max standard reward
    expect(screen.queryByText('₹500')).toBeNull(); // doubled reward is upsell-only, not shown here
  });

  test('a VIP user sees only the VIP reward, never the standard one', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = { isVip: true };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹100')).toBeTruthy(); // tier-2 VIP reward, already doubled
    expect(screen.queryByText('₹50')).toBeNull(); // tier-2's standardReward — must never reach a VIP screen
    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
  });

  test('a logged-out user (no profile) is treated as non-VIP, still no upsell in the snackbar', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = null;

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹700')).toBeTruthy(); // shortfall to ₹1500
    expect(screen.getByText('₹50')).toBeTruthy(); // tier-2 standard reward (non-VIP)
    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
  });

  test('a discount with cashback active: cashback replaces the "SAVED" line, still no upsell', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250, { mrp: toUnits(285) }) }; // saved ₹35
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.queryByText('SAVED ₹35')).toBeNull();
    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
  });

  test('fans up to 3 distinct products in a deck-of-cards stack', () => {
    mockCart = { p1: 1, p2: 1, p3: 1, p4: 1 };
    mockSnapshots = {
      p1: snapshot('p1', 20, { emoji: '🥛' }),
      p2: snapshot('p2', 20, { emoji: '🍎' }),
      p3: snapshot('p3', 20, { emoji: '🍞' }),
      p4: snapshot('p4', 20, { emoji: '🍪' }),
    };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getAllByTestId('cart-summary-chip')).toHaveLength(3);
    expect(screen.getByText('🍪')).toBeTruthy();
    expect(screen.getByText('🍞')).toBeTruthy();
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
