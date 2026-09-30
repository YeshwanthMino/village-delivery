import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VipStatusCard } from '../VipStatusCard';

let mockUser: { isVip?: boolean } | null = null;
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  vip_membership_title: 'VIP Membership',
  vip_active_benefit: "You're earning double cashback on every order",
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('VipStatusCard', () => {
  afterEach(() => {
    mockUser = null;
    mockPush.mockClear();
  });

  test('a real VIP user sees the status card', () => {
    mockUser = { isVip: true };
    render(<VipStatusCard />);

    expect(screen.getByText('VIP Membership')).toBeTruthy();
    expect(screen.getByText("You're earning double cashback on every order")).toBeTruthy();
  });

  test('tapping the card navigates to the VIP membership screen', () => {
    mockUser = { isVip: true };
    render(<VipStatusCard />);

    fireEvent.press(screen.getByTestId('vip-status-card'));

    expect(mockPush).toHaveBeenCalledWith('/vip-membership');
  });

  test('a non-VIP user sees nothing', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<VipStatusCard />);
    expect(toJSON()).toBeNull();
  });

  test('a logged-out user (no profile) sees nothing', () => {
    mockUser = null;
    const { toJSON } = render(<VipStatusCard />);
    expect(toJSON()).toBeNull();
  });
});
