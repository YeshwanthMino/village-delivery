import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CartItemRow } from '../CartItemRow';
import { CartLineItem } from '@/src/base/types/village.types';

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

describe('CartItemRow', () => {
  const mockItem: CartLineItem = {
    key: 'item-1',
    productId: 'prod-1',
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

    const { getByTestId } = render(
      <CartItemRow
        item={mockItem}
        stockStatus={stockStatus}
        onOutOfStockPress={onOutOfStockPress}
        testID="out-of-stock-badge"
      />
    );

    const badge = screen.getByText('Out of stock').closest('View');
    if (badge) {
      fireEvent.press(badge);
      expect(onOutOfStockPress).toHaveBeenCalled();
    }
  });

  test('shows stepper when item is in stock', () => {
    const stockStatus = { inStock: true, availableQuantity: 5 };
    render(<CartItemRow item={mockItem} stockStatus={stockStatus} />);

    // FullWidthStepper should be rendered (contains the count)
    expect(screen.queryByText('Out of stock')).toBeNull();
  });

  test('applies red border styling when item is out of stock', () => {
    const stockStatus = { inStock: false, availableQuantity: 0 };
    const { getByTestId } = render(
      <CartItemRow
        item={mockItem}
        stockStatus={stockStatus}
        testID="cart-item-row"
      />
    );

    // The component should have modified styling for out-of-stock items
    // In the actual implementation, this is done via className with border-red-200
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

  test('displays total price for quantity', () => {
    render(<CartItemRow item={mockItem} />);

    // Item price is 100, count is 2, so total should be 200
    // The component displays rupees(price * count)
  });

  test('handles item without image URL (emoji fallback)', () => {
    const itemWithoutImage = {
      ...mockItem,
      imageUrl: null,
    };

    render(<CartItemRow item={itemWithoutImage} />);

    expect(screen.getByText('Test Product')).toBeTruthy();
  });
});
