import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { VipBadge } from '../VipBadge';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => ({ vip_badge_label: 'VIP' } as Record<string, string>)[key] ?? key }),
}));

describe('VipBadge', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('a real VIP user sees the badge', () => {
    mockUser = { isVip: true };
    render(<VipBadge />);
    expect(screen.getByText('VIP')).toBeTruthy();
  });

  test('a non-VIP user sees nothing', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<VipBadge />);
    expect(toJSON()).toBeNull();
  });

  test('a logged-out user (no profile) sees nothing', () => {
    mockUser = null;
    const { toJSON } = render(<VipBadge />);
    expect(toJSON()).toBeNull();
  });
});
