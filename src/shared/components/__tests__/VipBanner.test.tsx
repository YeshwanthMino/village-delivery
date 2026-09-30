import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VipBanner } from '../VipBanner';

let mockUser: { isVip?: boolean } | null = null;
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({ vip_home_banner: 'VIP membership · double cashback on every order' } as Record<string, string>)[key] ?? key,
  }),
}));

describe('VipBanner', () => {
  afterEach(() => {
    mockUser = null;
    mockPush.mockClear();
  });

  test('a real VIP user sees the banner', () => {
    mockUser = { isVip: true };
    render(<VipBanner />);
    expect(screen.getByText('VIP membership · double cashback on every order')).toBeTruthy();
  });

  test('tapping the banner navigates to the VIP membership screen', () => {
    mockUser = { isVip: true };
    render(<VipBanner />);

    fireEvent.press(screen.getByTestId('vip-banner'));

    expect(mockPush).toHaveBeenCalledWith('/vip-membership');
  });

  test('a non-VIP user sees nothing', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<VipBanner />);
    expect(toJSON()).toBeNull();
  });
});
