import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OrderModificationSheet } from '../OrderModificationSheet';
import { rupees } from '@/src/shared/utils/currency';

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

    // prod1 out of stock -> 45 * 0 = 0 units
    // prod2 capped at available stock -> 96 * 1 = 96 units
    // subtotal = 96 units, which rupees() renders as 96 * 20.
    expect(screen.getAllByText(rupees(96)).length).toBeGreaterThan(0);
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
        onRetryCheckout={jest.fn().mockResolvedValue(undefined)}
      />
    );

    // prod2 is capped at its available stock of 1; stepping it down to 0 is a
    // real manual adjustment, which is what routes "Update all" down this branch.
    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    fireEvent.press(screen.getByText('Update all'));

    await waitFor(() => {
      expect(mockManualAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({ prod2: 0 }),
      );
    });
  });

  // prod2 has 3 of 3 available here so stepping it down leaves the row visible
  // (a row adjusted to 0 is hidden, and zeroing every row auto-closes the sheet).
  const adjustableProps = {
    ...mockProps,
    stockInfo: [
      { productId: 'prod1', availableStock: 0 },
      { productId: 'prod2', availableStock: 3 },
    ],
  };

  it('keeps a manual adjustment when the parent re-renders with equivalent props', () => {
    const { rerender } = render(<OrderModificationSheet {...adjustableProps} />);

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('3');
    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');

    // CartScreen builds `cartItems` inline with .map(), so every parent render
    // hands the sheet a fresh array with identical contents. That must not be
    // read as "new conflicts" and reset what the user just did.
    rerender(
      <OrderModificationSheet
        {...adjustableProps}
        stockInfo={adjustableProps.stockInfo.map(s => ({ ...s }))}
        cartItems={mockCartItems.map(i => ({ ...i }))}
      />
    );

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');
  });

  it('re-initialises when the conflicts themselves actually change', () => {
    const { rerender } = render(<OrderModificationSheet {...adjustableProps} />);

    fireEvent.press(screen.getByTestId('stepper-dec-prod2'));
    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('2');

    // A genuinely different availability is new information from the server and
    // should re-seed the quantities.
    rerender(
      <OrderModificationSheet
        {...adjustableProps}
        stockInfo={[
          { productId: 'prod1', availableStock: 0 },
          { productId: 'prod2', availableStock: 1 },
        ]}
      />
    );

    expect(screen.getByTestId('stepper-count-prod2')).toHaveTextContent('1');
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
