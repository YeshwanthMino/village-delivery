import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CashbackProgressBanner } from '../CashbackProgressBanner';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  cashback_shop_more: 'Shop {n} more to get {r} cashback',
  cashback_max_unlocked: 'Max cashback unlocked · {r}',
  vip_upsell_double: 'Upgrade to VIP for {f}/month to double your cashback to {r}!',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('CashbackProgressBanner', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('renders nothing below the minimum order value', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<CashbackProgressBanner grandTotal={toUnits(50)} />);
    expect(toJSON()).toBeNull();
  });

  test('toward first tier: shows the shortfall, the reward, and the VIP upsell', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(250)} />);

    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('₹25')).toBeTruthy();
    expect(screen.getByText('₹45')).toBeTruthy();
  });

  test('tier unlocked: counts down to the next tier only', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.getByText('₹700')).toBeTruthy();
    expect(screen.getByText('₹50')).toBeTruthy();
  });

  test('a VIP user sees no upsell line', () => {
    mockUser = { isVip: true };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.queryByText(/Upgrade to VIP for/)).toBeNull();
  });
});
