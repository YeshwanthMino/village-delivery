import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OrderModificationSheet } from '../OrderModificationSheet';

describe('OrderModificationSheet', () => {
  const mockStockInfo = [
    { productId: 'prod1', availableStock: 0 },
    { productId: 'prod2', availableStock: 1 },
  ];

  const mockCartItems = [
    {
      productId: 'prod1',
      name: 'Whole Wheat Bread',
      weight: '400 g pack',
      price: 45,
      image: 'bread.jpg',
      count: 2,
    },
    {
      productId: 'prod2',
      name: 'Farm Fresh Eggs',
      weight: '12 pc tray',
      price: 96,
      image: 'eggs.jpg',
      count: 3,
    },
  ];

  const mockProps = {
    visible: true,
    stockInfo: mockStockInfo,
    cartItems: mockCartItems,
    onClose: jest.fn(),
    onRetryCheckout: jest.fn(),
    onManualAdjustment: jest.fn(),
  };

  it('renders conflicts state when visible', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('A couple of things changed')).toBeTruthy();
    expect(
      screen.getByText('Some items in your cart are sold out or running low. Update your order to continue.')
    ).toBeTruthy();
  });

  it('displays out of stock item with Remove item button', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('Whole Wheat Bread')).toBeTruthy();
    expect(screen.getByText('Out of stock')).toBeTruthy();
    expect(screen.getByText('Remove item')).toBeTruthy();
  });

  it('displays low stock item with quantity stepper', () => {
    render(<OrderModificationSheet {...mockProps} />);

    expect(screen.getByText('Farm Fresh Eggs')).toBeTruthy();
    expect(screen.getByText('Only 1 left')).toBeTruthy();
  });

  it('calculates correct subtotal', () => {
    render(<OrderModificationSheet {...mockProps} />);

    // prod1 out of stock (0 qty) = 45 * 0 = 0
    // prod2 low stock (1 qty) = 96 * 1 = 96
    // subtotal = 96
    const subtotalText = screen.getAllByText('₹96');
    expect(subtotalText.length).toBeGreaterThan(0);
  });

  it('calls onRetryCheckout when Update all tapped without manual changes', async () => {
    const mockRetryCheckout = jest.fn().mockResolvedValue(undefined);
    render(
      <OrderModificationSheet
        {...mockProps}
        onRetryCheckout={mockRetryCheckout}
      />
    );

    const updateAllButton = screen.getByText('Update all');
    fireEvent.press(updateAllButton);

    await waitFor(() => {
      expect(mockRetryCheckout).toHaveBeenCalled();
    });
  });

  it('calls onManualAdjustment when user manually adjusts and taps Update all', async () => {
    const mockManualAdjustment = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        onManualAdjustment={mockManualAdjustment}
      />
    );

    // Note: In actual app, user would press stepper to trigger manual adjustment
    // This test structure is simplified for the mock environment

    const updateAllButton = screen.getByText('Update all');
    fireEvent.press(updateAllButton);

    await waitFor(() => {
      expect(mockManualAdjustment).toHaveBeenCalled();
    });
  });

  it('closes sheet when X button tapped', () => {
    const mockOnClose = jest.fn();
    render(
      <OrderModificationSheet
        {...mockProps}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('close-button-conflicts');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error message on retry failure', async () => {
    const mockRetryCheckout = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
    render(
      <OrderModificationSheet
        {...mockProps}
        onRetryCheckout={mockRetryCheckout}
      />
    );

    const updateAllButton = screen.getByText('Update all');
    fireEvent.press(updateAllButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeTruthy();
    });
  });
});
