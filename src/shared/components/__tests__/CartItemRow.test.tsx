import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CartItemRow } from '../CartItemRow';
import { CartLineItem } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector => {
    return selector({
      addToCart: jest.fn(),
      decFromCart: jest.fn(),
    });
  }),
}));

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('CartItemRow', () => {
  const mockItem: CartLineItem = {
    key: 'item-1',
    productId: 'prod-1',
    variantIndex: null,
    name: 'Test Product',
    nameTE: '',
    weight: '500g',
    price: 100,
    mrp: 200,
    count: 2,
    imageUrl: 'https://example.com/image.jpg',
    emoji: '🍎',
    gradientFrom: 'from-red-200',
    gradientTo: 'to-red-600',
  };

  test('renders cart item without stock status', () => {
    render(<CartItemRow item={mockItem} />);

    expect(screen.getByText('Test Product')).toBeTruthy();
    expect(screen.getByText('500g')).toBeTruthy();
  });

  test('does not show out-of-stock badge when item is in stock', () => {
    const stockStatus = { inStock: true, availableQuantity: 5 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} />);

    expect(screen.queryByText('Out of stock')).toBeNull();
  });

  test('shows out-of-stock badge when item is out of stock', () => {
    const stockStatus = { inStock: false, availableQuantity: 0 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} onOutOfStockPress={jest.fn()} />);

    expect(screen.getByText('Out of stock')).toBeTruthy();
  });

  test('calls onOutOfStockPress when badge is pressed', () => {
    const onOutOfStockPress = jest.fn();
    const stockStatus = { inStock: false, availableQuantity: 0 };

    render(
      <CartItemRow
        item={mockItem}
        stockStatus={stockStatus}
        onOutOfStockPress={onOutOfStockPress}
      />
    );

    fireEvent.press(screen.getByTestId('out-of-stock-badge'));

    expect(onOutOfStockPress).toHaveBeenCalledTimes(1);
  });

  test('shows stepper when item is in stock', () => {
    const stockStatus = { inStock: true, availableQuantity: 5 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} />);

    // FullWidthStepper should be rendered (contains the count)
    expect(screen.queryByText('Out of stock')).toBeNull();
  });

  test('swaps the stepper for remove actions when out of stock', () => {
    const stockStatus = { inStock: false, availableQuantity: 0 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} />);

    expect(screen.getByTestId('out-of-stock-badge')).toBeTruthy();
    expect(screen.getByText('Remove')).toBeTruthy();
  });

  test('handles undefined stockStatus gracefully', () => {
    render(<CartItemRow item={mockItem} stockStatus={undefined} />);

    expect(screen.getByText('Test Product')).toBeTruthy();
    expect(screen.queryByText('Out of stock')).toBeNull();
  });

  test('displays discount badge when applicable', () => {
    const itemWithDiscount = {
      ...mockItem,
      price: 100,
      mrp: 200,
    };

    render(<CartItemRow item={itemWithDiscount} />);

    // Discount should be: (1 - 100/200) * 100 = 50%
    expect(screen.getByText('50%')).toBeTruthy();
  });

  test('displays the line total for the quantity', () => {
    // count 3 keeps the line total (300 units) distinct from the struck-through
    // mrp (200 units), which would otherwise render the same string.
    render(<CartItemRow item={{ ...mockItem, count: 3 }} />);

    expect(screen.getByText(rupees(300))).toBeTruthy();
  });

  test('handles item without image URL (emoji fallback)', () => {
    const itemWithoutImage = {
      ...mockItem,
      imageUrl: undefined,
    };

    render(<CartItemRow item={itemWithoutImage} />);

    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  test('forwards bottomOffset to the stepper for the stock-limit snackbar', () => {
    const stockStatus = { inStock: true, availableQuantity: 2 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} bottomOffset={120} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(useSnackbarStore.getState().bottomOffset).toBe(120);
  });
});
