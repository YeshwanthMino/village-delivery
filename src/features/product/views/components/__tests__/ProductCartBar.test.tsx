// src/features/product/views/components/__tests__/ProductCartBar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProductCartBar } from '../ProductCartBar';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('ProductCartBar', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(
      <ProductCartBar count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} onViewCart={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('cart-bar-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(
      <ProductCartBar count={5} maxQuantity={5} onAdd={onAdd} onDec={jest.fn()} onViewCart={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('cart-bar-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 5 left in stock');
  });
});
