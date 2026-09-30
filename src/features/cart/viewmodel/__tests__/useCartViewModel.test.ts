import { renderHook, act } from '@testing-library/react-native';
import { toUnits } from '@/src/shared/utils/currency';

let mockWalletData: { cashback: number } | null | undefined = undefined;

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector => selector({
    cart: { 'prod-1': 1 },
    cartSnapshots: {
      'prod-1': {
        // toUnits(250) precomputed as a literal — babel-plugin-jest-hoist
        // forbids referencing out-of-scope, non-"mock"-prefixed identifiers
        // (like the imported toUnits) inside a jest.mock() factory.
        key: 'prod-1', productId: 'prod-1', variantIndex: null,
        name: 'Test', weight: '1 pc', price: 12.5, mrp: 12.5,
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

    rerender(undefined);
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
