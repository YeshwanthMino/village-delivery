import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CheckoutBar } from '../CheckoutBar';
import { toUnits } from '@/src/shared/utils/currency';

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => key,
    tShopMoreToPlaceOrder: (amount: string) => `Shop for ${amount} more to place order`,
  }),
}));

describe('CheckoutBar', () => {
  const noop = () => {};

  test('below_minimum: shows the nudge message, no place-order button', () => {
    render(
      <CheckoutBar
        state="below_minimum"
        grandTotal={toUnits(100)}
        amountToMinimum={toUnits(99)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('Shop for ₹99 more to place order')).toBeTruthy();
    expect(screen.queryByText('place_order')).toBeNull();
  });

  test('below_minimum: fractional shortfall displays ceiled, never ₹0', () => {
    render(
      <CheckoutBar
        state="below_minimum"
        grandTotal={toUnits(198.9)}
        amountToMinimum={toUnits(0.1)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('Shop for ₹1 more to place order')).toBeTruthy();
    expect(screen.queryByText('Shop for ₹0 more to place order')).toBeNull();
  });

  test('login: shows the login button', () => {
    render(
      <CheckoutBar
        state="login"
        grandTotal={toUnits(250)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('login_to_proceed')).toBeTruthy();
  });

  test('place: shows the place-order button with the grand total', () => {
    render(
      <CheckoutBar
        state="place"
        grandTotal={toUnits(250)}
        onLogin={noop}
        onSelectAddress={noop}
        onPlaceOrder={noop}
      />
    );

    expect(screen.getByText('place_order')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
  });
});
