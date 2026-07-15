import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StockConflictDialog } from '../StockConflictDialog';

// Mock the translation hook
jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        stock_conflict_title: 'Update your order',
        stock_conflict_subtitle: 'Some items aren\'t fully available',
        stock_conflict_remove_badge: 'Remove',
        stock_conflict_reduce_to: 'Reduce to 2',
        stock_conflict_quantity_change: 'Had {current}, now: {available}',
        stock_conflict_update_button: 'Update Cart',
        stock_conflict_cancel_button: 'Cancel',
        stock_conflict_updating: 'Updating your cart...',
        stock_conflict_retrying: 'Placing your order...',
        stock_conflict_error: 'Couldn\'t update your order. Try again?',
        stock_conflict_try_again: 'Try Again',
        stock_conflict_back_to_cart: 'Back to Cart',
      };
      return translations[key] || key;
    },
  }),
}));

describe('StockConflictDialog', () => {
  const mockStockInfo = [
    { productId: 'prod1', availableStock: 0 },
    { productId: 'prod2', availableStock: 2 },
  ];

  const mockCartItems = [
    {
      productId: 'prod1',
      name: 'Godrej Soap',
      weight: '100g',
      price: 50,
      image: 'http://example.com/soap.jpg',
      count: 2,
    },
    {
      productId: 'prod2',
      name: 'Jet Gold',
      weight: '250ml',
      price: 150,
      image: 'http://example.com/jet.jpg',
      count: 5,
    },
  ];

  const mockOnUpdateCart = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when visible is false', () => {
    const { queryByText } = render(
      <StockConflictDialog
        visible={false}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(queryByText('Update your order')).not.toBeOnTheScreen();
  });

  test('renders when visible is true', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Update your order')).toBeOnTheScreen();
    expect(getByText('Some items aren\'t fully available')).toBeOnTheScreen();
  });

  test('displays affected products with correct badges', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    // Check for product names
    expect(getByText('Godrej Soap')).toBeOnTheScreen();
    expect(getByText('Jet Gold')).toBeOnTheScreen();

    // Check for badges
    expect(getByText('Remove')).toBeOnTheScreen();
    expect(getByText('Reduce to 2')).toBeOnTheScreen();
  });

  test('displays quantity changes correctly', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Had 2, now: 0')).toBeOnTheScreen();
    expect(getByText('Had 5, now: 2')).toBeOnTheScreen();
  });

  test('calls onCancel when Cancel button is pressed', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('calls onUpdateCart when Update Cart button is pressed', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    const updateButton = getByText('Update Cart');
    fireEvent.press(updateButton);

    expect(mockOnUpdateCart).toHaveBeenCalled();
  });

  test('shows loading state when updating', async () => {
    const slowUpdate = jest.fn(
      async () => new Promise<void>(resolve => setTimeout(resolve, 100))
    );

    const { getByText, queryByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={slowUpdate}
        onCancel={mockOnCancel}
      />
    );

    const updateButton = getByText('Update Cart');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Updating your cart...')).toBeOnTheScreen();
    });
  });

  test('skips products not found in cart', () => {
    const conflictWithMissingProduct = [
      { productId: 'missing-prod', availableStock: 0 },
      { productId: 'prod1', availableStock: 0 },
    ];

    const { getByText, queryByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={conflictWithMissingProduct}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Godrej Soap')).toBeOnTheScreen();
    // Missing product should not crash; just not displayed
  });
});
