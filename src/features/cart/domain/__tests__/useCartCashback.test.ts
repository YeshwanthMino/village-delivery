import { renderHook } from '@testing-library/react-native';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

import { useCartCashback } from '../useCartCashback';

describe('useCartCashback', () => {
  afterEach(() => {
    mockUser = null;
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
});
