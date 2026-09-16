import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WalletCard } from '../WalletCard';
import { toUnits } from '@/src/shared/utils/currency';

let mockWalletResult: {
  data: { cashback: number; daysLeft: number | null } | null;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
};

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

jest.mock('@/src/core/store/useAuthStore', () => ({
  useAuthStore: jest.fn(selector => selector({ isAuthenticated: true })),
}));

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

jest.mock('../../../data/queries/useWalletQuery', () => ({
  useWalletQuery: () => mockWalletResult,
}));

describe('WalletCard', () => {
  test('hides the expiry line when the balance is zero, even with a real expiry date', () => {
    mockWalletResult = {
      data: { cashback: 0, daysLeft: 54 },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
    render(<WalletCard />);

    expect(screen.getByText('₹0')).toBeTruthy();
    expect(screen.queryByText(/Expires in/)).toBeNull();
  });

  test('shows the expiry line when the balance is positive', () => {
    mockWalletResult = {
      data: { cashback: toUnits(50), daysLeft: 54 },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
    render(<WalletCard />);

    expect(screen.getByText('₹50')).toBeTruthy();
    expect(screen.getByText(/Expires in/)).toBeTruthy();
  });
});
