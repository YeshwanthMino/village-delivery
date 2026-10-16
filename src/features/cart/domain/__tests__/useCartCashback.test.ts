import { renderHook } from '@testing-library/react-native';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;
let mockVipAddedInCart = false;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
  useVillageStore: jest.fn(selector => selector({ vipAddedInCart: mockVipAddedInCart })),
}));

import { useCartCashback } from '../useCartCashback';

describe('useCartCashback', () => {
  afterEach(() => {
    mockUser = null;
    mockVipAddedInCart = false;
  });

  test('treats a logged-out user (no profile) as non-VIP', () => {
    mockUser = null;
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).not.toBeNull();
  });

  test('reads isVip from the auth store profile', () => {
    mockUser = { isVip: true };
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).toBeNull();
  });

  test('uses the live CASHBACK_SETTINGS tiers to classify the phase', () => {
    mockUser = { isVip: false };
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.phase).toBe('tier_unlocked');
  });

  test('a non-VIP user who added VIP to this cart gets VIP rates immediately', () => {
    mockUser = { isVip: false };
    mockVipAddedInCart = true;
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).toBeNull();
    expect(result.current.primary.vars.r).toBe('₹100'); // tier-2 VIP reward, not ₹50 standard
  });

  test('a logged-out user who added VIP to this cart also gets VIP rates', () => {
    mockUser = null;
    mockVipAddedInCart = true;
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).toBeNull();
  });
});
