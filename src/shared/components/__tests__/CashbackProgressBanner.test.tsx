import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CashbackProgressBanner } from '../CashbackProgressBanner';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;
let mockVipAddedInCart = false;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
  useVillageStore: jest.fn(selector => selector({ vipAddedInCart: mockVipAddedInCart })),
}));

const mockRawTemplates: Record<string, string> = {
  cashback_shop_more: 'Shop {n} more to get {r} cashback',
  cashback_max_unlocked: 'Max cashback unlocked · {r}',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('CashbackProgressBanner', () => {
  afterEach(() => {
    mockUser = null;
    mockVipAddedInCart = false;
  });

  test('renders nothing below the minimum order value', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<CashbackProgressBanner grandTotal={toUnits(50)} />);
    expect(toJSON()).toBeNull();
  });

  test('toward first tier: shows the shortfall and the reward, no VIP line', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(250)} />);

    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('₹25')).toBeTruthy();
    // The VIP upsell moved to its own card (VipMembershipCard) — the banner
    // is tier-progress only now.
    expect(screen.queryByText(/VIP/)).toBeNull();
  });

  test('tier unlocked: counts down to the next tier only', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.getByText('₹700')).toBeTruthy();
    expect(screen.getByText('₹50')).toBeTruthy();
  });

  test('a VIP user (real or added-in-cart) sees the same tier-progress-only banner', () => {
    mockUser = { isVip: true };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.getByText('₹700')).toBeTruthy();
    expect(screen.getByText('₹100')).toBeTruthy(); // VIP reward
    expect(screen.queryByText(/VIP/)).toBeNull();
  });
});
